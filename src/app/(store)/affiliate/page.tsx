'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore, useMoney } from '@/components/Providers';
import { api } from '@/lib/client';

import Icon from '@/components/icons';
import { formatDateTime } from '@/lib/utils';
import { INTL_LOCALE } from '@/i18n';

type Data = {
  enabled: boolean;
  rate: number;
  refCode: string | null;
  link: string;
  referredCount: number;
  totalCommission: number;
  recent: { id: number; amount: number; note: string | null; createdAt: string }[];
  productRates: { name: string; slug: string; rate: number }[];
};

export default function AffiliatePage() {
  const { user, toast, locale } = useStore();
  const intlLocale = INTL_LOCALE[locale];
  const money = useMoney();
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    if (user === null) router.replace('/login?next=/affiliate');
    if (user) api<Data>('/api/affiliate/me').then(setData).catch(() => {});
  }, [user, router]);

  if (!user || !data) return <div className="container py-16 text-center text-gray-400">Loading…</div>;

  const copy = async () => {
    await navigator.clipboard.writeText(data.link);
    toast('Referral link copied');
  };

  return (
    <div className="container max-w-4xl py-8">
      <p className="section-eyebrow">Earn with us</p>
      <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Affiliate program</h1>
      <p className="mt-1 text-sm text-gray-500">
        Share your link — earn <b>{data.rate}%</b> of every order your referrals pay for, credited straight to your wallet.
        Some products pay a custom rate (see below).
      </p>

      {!data.enabled && (
        <div className="card mt-5 border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-800">
          The affiliate program is currently disabled by the store. Your link will start earning once it&apos;s re-enabled.
        </div>
      )}

      {/* Link card */}
      <div className="card mt-5 p-5">
        <label className="label">Your referral link</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input className="input flex-1 font-mono text-sm" readOnly value={data.link} onFocus={(e) => e.target.select()} />
          <button className="btn-primary shrink-0" onClick={copy}>
            <Icon name="ticket" size={15} /> Copy link
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Anyone who signs up after clicking your link is attributed to you (30-day cookie).
        </p>
      </div>

      {/* Stats */}
      <div className="mt-5 grid grid-cols-3 gap-4">
        {([
          ['users', String(data.referredCount), 'Referred users'],
          ['credit-card', money(data.totalCommission), 'Total earned'],
          ['bolt', `${data.rate}%`, 'Commission rate'],
        ] as const).map(([icon, value, label]) => (
          <div key={label} className="card flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
              <Icon name={icon} size={18} />
            </span>
            <span>
              <span className="block text-lg font-extrabold leading-tight">{value}</span>
              <span className="block text-xs text-gray-500">{label}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Per-product commission rates */}
      {data.productRates.length > 0 && (
        <div className="card mt-5">
          <div className="border-b border-gray-100 p-4">
            <h2 className="font-bold">Product commission rates</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              These products pay their own rate instead of the standard {data.rate}%. Link straight to them to maximize earnings.
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            {data.productRates.map((p) => (
              <a
                key={p.slug}
                href={`/product/${p.slug}?ref=${data.refCode}`}
                className="flex items-center gap-3 px-4 py-3 transition hover:bg-gray-50"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                  <Icon name="bag" size={16} />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.name}</span>
                <span className={`badge ${p.rate > data.rate ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {p.rate}% commission
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Recent commissions */}
      <div className="card mt-5">
        <h2 className="border-b border-gray-100 p-4 font-bold">Recent commissions</h2>
        <div className="divide-y divide-gray-100">
          {data.recent.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-green-50 text-green-600">
                <Icon name="check" size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{t.note || 'Commission'}</span>
                <span className="block text-xs text-gray-400">
                  {formatDateTime(t.createdAt, intlLocale, { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </span>
              <span className="text-sm font-bold text-green-600">+{money(t.amount)}</span>
            </div>
          ))}
          {data.recent.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-gray-400">
              No commissions yet — share your link to start earning.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
