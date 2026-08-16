'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore, useMoney, useT } from '@/components/Providers';
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
  const t = useT();
  const intlLocale = INTL_LOCALE[locale];
  const money = useMoney();
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    if (user === null) router.replace('/login?next=/affiliate');
    if (user) api<Data>('/api/affiliate/me').then(setData).catch(() => {});
  }, [user, router]);

  if (!user || !data) return <div className="container py-16 text-center text-gray-400">{t('common.loading')}</div>;

  const copy = async () => {
    await navigator.clipboard.writeText(data.link);
    toast(t('affiliate.linkCopied'));
  };

  return (
    <div className="container max-w-4xl py-8">
      <p className="section-eyebrow">{t('affiliate.eyebrow')}</p>
      <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{t('affiliate.title')}</h1>
      <p className="mt-1 text-sm text-gray-500">{t('affiliate.intro', { rate: data.rate })}</p>

      {!data.enabled && (
        <div className="card mt-5 border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-800">
          {t('affiliate.disabled')}
        </div>
      )}

      {/* Link card */}
      <div className="card mt-5 p-5">
        <label className="label">{t('affiliate.yourLink')}</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input className="input flex-1 font-mono text-sm" readOnly value={data.link} onFocus={(e) => e.target.select()} />
          <button className="btn-primary shrink-0" onClick={copy}>
            <Icon name="ticket" size={15} /> {t('affiliate.copyLink')}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          {t('affiliate.cookieNote')}
        </p>
      </div>

      {/* Stats */}
      <div className="mt-5 grid grid-cols-3 gap-4">
        {([
          ['users', String(data.referredCount), t('affiliate.referredUsers')],
          ['credit-card', money(data.totalCommission), t('affiliate.totalEarned')],
          ['bolt', `${data.rate}%`, t('affiliate.rateLabel')],
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
            <h2 className="font-bold">{t('affiliate.productRates')}</h2>
            <p className="mt-0.5 text-xs text-gray-500">{t('affiliate.productRatesNote', { rate: data.rate })}</p>
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
                  {t('affiliate.commissionBadge', { rate: p.rate })}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Recent commissions */}
      <div className="card mt-5">
        <h2 className="border-b border-gray-100 p-4 font-bold">{t('affiliate.recent')}</h2>
        <div className="divide-y divide-gray-100">
          {data.recent.map((row) => (
            <div key={row.id} className="flex items-center gap-3 px-4 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-green-50 text-green-600">
                <Icon name="check" size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{row.note || t('affiliate.commission')}</span>
                <span className="block text-xs text-gray-400">
                  {formatDateTime(row.createdAt, intlLocale, { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </span>
              <span className="text-sm font-bold text-green-600">+{money(row.amount)}</span>
            </div>
          ))}
          {data.recent.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-gray-400">
              {t('affiliate.none')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
