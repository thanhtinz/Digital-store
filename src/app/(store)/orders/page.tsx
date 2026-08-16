import Link from 'next/link';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

import StatusBadge from '@/components/StatusBadge';
import Icon from '@/components/icons';
import { getMoneyFormatter } from '@/lib/currency';
import { formatDate } from '@/lib/utils';
import { INTL_LOCALE } from '@/i18n';
import { getLocale, getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  return { title: getT()('meta.orders') };
}

const FILTERS = [
  { key: '', labelKey: 'orders.filterAll' },
  { key: 'PENDING', labelKey: 'orders.status.PENDING' },
  { key: 'PAID', labelKey: 'orders.status.PAID' },
  { key: 'COMPLETED', labelKey: 'orders.status.COMPLETED' },
  { key: 'CANCELLED', labelKey: 'orders.status.CANCELLED' },
] as const;

export default async function OrdersPage({ searchParams }: { searchParams: { status?: string } }) {
  const intlLocale = INTL_LOCALE[getLocale()];
  const t = getT();
  const money = await getMoneyFormatter();
  const user = await getSessionUser();
  if (!user) redirect('/login?next=/orders');

  const status = FILTERS.some((f) => f.key === searchParams.status) ? searchParams.status || '' : '';

  const [orders, grouped] = await Promise.all([
    prisma.order.findMany({
      where: { userId: user.id, ...(status ? { status: status as any } : {}) },
      orderBy: { id: 'desc' },
      take: 100,
      include: { items: true },
    }),
    prisma.order.groupBy({ by: ['status'], where: { userId: user.id }, _count: true }),
  ]);
  const countFor = (key: string) =>
    key === '' ? grouped.reduce((s, g) => s + g._count, 0) : grouped.find((g) => g.status === key)?._count || 0;

  return (
    <div className="container max-w-4xl py-8">
      <p className="section-eyebrow">{t('orders.eyebrow')}</p>
      <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{t('orders.pageTitle')}</h1>
      <p className="mt-1 text-sm text-gray-500">{t('orders.intro')}</p>

      {/* Status filter chips */}
      <div className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = status === f.key;
          const count = countFor(f.key);
          return (
            <Link
              key={f.key}
              href={f.key ? `/orders?status=${f.key}` : '/orders'}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                active ? 'bg-gray-900 text-white' : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {t(f.labelKey)}
              <span className={`rounded-full px-1.5 text-xs font-bold ${active ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      {orders.length === 0 ? (
        <div className="card mt-6 p-16 text-center">
          <Icon name="box" size={56} className="mx-auto text-gray-300" />
          <p className="mt-4 font-semibold">{status ? t('orders.noneWithStatus') : t('orders.empty')}</p>
          <Link href="/products" className="btn-primary mt-5 inline-flex">{t('orders.startShopping')}</Link>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {orders.map((o) => {
            const itemCount = o.items.reduce((s, i) => s + i.quantity, 0);
            const deliveredCount = o.items.filter((i) => i.deliveredAt).length;
            return (
              <Link key={o.id} href={`/orders/${o.code}`} className="card block p-4 transition hover:border-brand-300 hover:shadow-md">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex h-12 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
                    {o.items[0]?.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={o.items[0].imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-gray-300"><Icon name="box" size={24} /></span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      <span className="font-mono">#{o.code}</span>
                      <span className="ml-2 text-xs font-normal text-gray-400">
                        {formatDate(o.createdAt, intlLocale, { year: 'numeric', month: 'short', day: 'numeric' })}
                        {o.paymentMethod && <> · <span className="capitalize">{o.paymentMethod}</span></>}
                      </span>
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">
                      {o.items.map((i) => `${i.productName} ×${i.quantity}`).join(', ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden text-right sm:block">
                      <p className="text-xs text-gray-400">
                        {itemCount === 1 ? t('orders.itemCountOne') : t('orders.itemCount', { count: itemCount })}
                      </p>
                      {o.status === 'PAID' && (
                        <p className="text-xs font-medium text-blue-600">
                          {t('orders.deliveredCount', { done: deliveredCount, total: o.items.length })}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={o.status} label={t(`orders.status.${o.status}`)} />
                    <span className="w-20 text-right text-sm font-bold">{money(Number(o.total), o.currency)}</span>
                    <Icon name="chevron-right" size={16} className="text-gray-300" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
