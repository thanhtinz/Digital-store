import Link from 'next/link';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { voucherHeadline, type Voucher } from '@/lib/voucher';
import { CopyCodeButton } from '@/components/VoucherCard';
import Icon from '@/components/icons';
import { getMoneyFormatter } from '@/lib/currency';
import { INTL_LOCALE } from '@/i18n';
import { getLocale, getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  return { title: getT()('meta.vouchers') };
}

type Status = 'available' | 'used' | 'usedUp' | 'exhausted' | 'expired' | 'notStarted';

type VoucherRow = {
  voucher: Voucher;
  status: Status;
  personal: boolean;
  usesLeft: number | null;
};

const DIMMED: Record<Status, boolean> = {
  available: false,
  used: false,
  usedUp: true,
  exhausted: true,
  expired: true,
  notStarted: true,
};

export default async function VouchersPage() {
  const t = getT();
  const intlLocale = INTL_LOCALE[getLocale()];
  const user = await getSessionUser();
  if (!user) redirect('/login?next=/vouchers');
  const money = await getMoneyFormatter();

  const now = new Date();

  const [grants, allGrantCodes, redemptions] = await Promise.all([
    prisma.autoCouponGrant.findMany({
      where: { userId: user.id },
      orderBy: { id: 'desc' },
      include: { rule: true },
      take: 50,
    }),
    prisma.autoCouponGrant.findMany({ select: { couponCode: true }, distinct: ['couponCode'] }),
    prisma.couponRedemption.findMany({ where: { userId: user.id }, select: { couponId: true } }),
  ]);
  const usedByCoupon = new Map<number, number>();
  for (const r of redemptions) usedByCoupon.set(r.couponId, (usedByCoupon.get(r.couponId) || 0) + 1);
  const personalCodes = new Set(allGrantCodes.map((g) => g.couponCode));

  const grantCodes = grants.map((g) => g.couponCode);
  const [grantCoupons, publicCoupons] = await Promise.all([
    grantCodes.length
      ? prisma.coupon.findMany({ where: { code: { in: grantCodes } } })
      : Promise.resolve([]),
    prisma.coupon.findMany({
      where: { isActive: true, ...(personalCodes.size ? { code: { notIn: Array.from(personalCodes) } } : {}) },
      orderBy: { id: 'desc' },
      take: 60,
    }),
  ]);
  const grantCouponByCode = new Map(grantCoupons.map((c) => [c.code, c]));

  const statusOf = (c: {
    startsAt: Date | null;
    endsAt: Date | null;
    maxUses: number | null;
    usedCount: number;
    perUserLimit: number | null;
    id: number;
  }): Status => {
    if (c.endsAt && c.endsAt < now) return 'expired';
    if (c.startsAt && c.startsAt > now) return 'notStarted';
    const mine = usedByCoupon.get(c.id) || 0;
    if (c.perUserLimit != null && mine >= c.perUserLimit) return 'usedUp';
    if (c.maxUses != null && c.usedCount >= c.maxUses) return 'exhausted';
    if (mine > 0) return 'used';
    return 'available';
  };

  const toRow = (
    c: { id: number; code: string; type: string; value: any; minOrder: any; maxDiscount: any; startsAt: Date | null; endsAt: Date | null; maxUses: number | null; usedCount: number; perUserLimit: number | null },
    personal: boolean
  ): VoucherRow => ({
    voucher: {
      code: c.code,
      type: c.type as Voucher['type'],
      value: Number(c.value),
      minOrder: c.minOrder != null ? Number(c.minOrder) : null,
      maxDiscount: c.maxDiscount != null ? Number(c.maxDiscount) : null,
      endsAt: c.endsAt ? c.endsAt.toISOString() : null,
    },
    status: statusOf(c),
    personal,
    usesLeft: c.maxUses != null ? Math.max(0, c.maxUses - c.usedCount) : null,
  });

  const personalRows: VoucherRow[] = grants.map((g) => {
    const c = grantCouponByCode.get(g.couponCode);
    if (c) return toRow(c, true);
    // The granted coupon row is gone (deleted by an admin) — fall back to
    // the rule snapshot so the customer still sees what they were given.
    const endsAt = new Date(g.createdAt.getTime() + g.rule.expiresDays * 86400_000);
    return toRow(
      {
        id: -g.id,
        code: g.couponCode,
        type: g.rule.discountType,
        value: g.rule.value,
        minOrder: null,
        maxDiscount: g.rule.maxDiscount,
        startsAt: null,
        endsAt,
        maxUses: 1,
        usedCount: 0,
        perUserLimit: 1,
      },
      true
    );
  });
  const publicRows: VoucherRow[] = publicCoupons.map((c) => toRow(c, false));

  const sortRows = (rows: VoucherRow[]) =>
    [...rows].sort((a, b) => Number(DIMMED[a.status]) - Number(DIMMED[b.status]));
  const personal = sortRows(personalRows);
  const pub = sortRows(publicRows);
  const isEmpty = personal.length === 0 && pub.length === 0;

  const statusLabel = (s: Status) =>
    s === 'used'
      ? t('vouchers.statusUsed')
      : s === 'usedUp'
        ? t('vouchers.statusUsedUp')
        : s === 'exhausted'
          ? t('vouchers.statusExhausted')
          : s === 'expired'
            ? t('vouchers.statusExpired')
            : s === 'notStarted'
              ? t('vouchers.statusNotStarted')
              : null;

  const renderCard = (row: VoucherRow) => {
    const v = row.voucher;
    const dimmed = DIMMED[row.status];
    const label = statusLabel(row.status);
    const conditions: string[] = [];
    if (v.minOrder != null) conditions.push(t('home.voucherMinOrder', { amount: money(v.minOrder) }));
    if (v.type === 'PERCENT' && v.maxDiscount != null) conditions.push(t('home.voucherMaxOff', { amount: money(v.maxDiscount) }));
    if (row.usesLeft != null && !dimmed) conditions.push(t('vouchers.usesLeft', { count: row.usesLeft }));
    if (v.endsAt) {
      const date = new Intl.DateTimeFormat(intlLocale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(v.endsAt));
      conditions.push(t('home.voucherExpires', { date }));
    }
    return (
      <div
        key={`${row.personal ? 'p' : 'g'}-${v.code}`}
        className={`relative flex overflow-hidden rounded-2xl bg-white/70 shadow-glass ring-1 ring-white/70 backdrop-blur-xl ${dimmed ? 'opacity-60 saturate-50' : ''}`}
      >
        <div className="flex w-[37%] shrink-0 flex-col items-center justify-center gap-0.5 bg-gradient-to-br from-brand-500 to-brand-700 px-2.5 py-3 text-center text-white">
          <Icon name="ticket" size={18} className="opacity-80" />
          <p className="text-sm font-extrabold leading-tight sm:text-base">{voucherHeadline(v, t, money)}</p>
          {row.personal && (
            <span className="mt-1 rounded-full bg-white/25 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide">{t('vouchers.personalTag')}</span>
          )}
        </div>
        <div className="relative flex min-w-0 flex-1 flex-col justify-center gap-1 px-3.5 py-2.5">
          <span className="pointer-events-none absolute bottom-2 left-0 top-2 border-s border-dashed border-gray-300" />
          <p className="flex flex-wrap items-center gap-2">
            <span className="truncate font-mono text-sm font-extrabold tracking-[.14em] text-gray-900">{v.code}</span>
            {label && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${row.status === 'used' ? 'bg-sky-100 text-sky-700' : 'bg-gray-200 text-gray-600'}`}>
                {label}
              </span>
            )}
          </p>
          {conditions.length > 0 && (
            <p className="line-clamp-2 text-[11px] leading-snug text-gray-500">{conditions.join(' · ')}</p>
          )}
          {!dimmed && (
            <div className="mt-0.5">
              <CopyCodeButton code={v.code} />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container py-8">
      <p className="section-eyebrow">{t('vouchers.eyebrow')}</p>
      <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{t('vouchers.title')}</h1>

      {isEmpty ? (
        <div className="card mt-6 p-16 text-center">
          <Icon name="ticket" size={56} className="mx-auto text-gray-300" />
          <p className="mt-4 font-semibold">{t('vouchers.empty')}</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">{t('vouchers.emptyText')}</p>
          <Link href="/products" className="btn-primary mt-5 inline-flex">{t('cart.browse')}</Link>
        </div>
      ) : (
        <div className="mt-6 space-y-10">
          {personal.length > 0 && (
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-gray-900">
                <Icon name="gift" size={19} className="text-brand-600" /> {t('vouchers.personalTitle')}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{personal.map(renderCard)}</div>
            </section>
          )}
          {pub.length > 0 && (
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-gray-900">
                <Icon name="ticket" size={19} className="text-brand-600" /> {t('vouchers.publicTitle')}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{pub.map(renderCard)}</div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
