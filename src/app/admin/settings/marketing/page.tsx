'use client';

import Icon from '@/components/icons';
import { useSettings, field, toggle, SettingsHeader } from '../shared';
import { useAdminT } from '@/components/Providers';

export default function AdminMarketingSettingsPage() {
  const { s, set, save, busy } = useSettings();
  const t = useAdminT();
  if (!s) return <div className="py-16 text-center text-gray-400">{t('admin.settings.loading')}</div>;

  return (
    <div>
      <SettingsHeader
        title={t('admin.marketing.title')}
        subtitle={t('admin.marketing.subtitle')}
        onSave={save}
        busy={busy}
      />

      <div className="card mt-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold">
            <Icon name="star" className="text-amber-500" /> {t('admin.marketing.loyaltyTitle')}
          </h2>
          {toggle(s, set, 'loyalty_enabled', t('admin.notify.enabled'))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {field(s, set, { k: 'loyalty_earn_rate', label: t('admin.marketing.earnRate'), type: 'number', help: t('admin.marketing.earnRateHelp') })}
          {field(s, set, { k: 'loyalty_redeem_value', label: t('admin.marketing.redeemValue'), type: 'number', help: t('admin.marketing.redeemValueHelp') })}
          {field(s, set, { k: 'loyalty_min_redeem', label: t('admin.marketing.minRedeem'), type: 'number' })}
        </div>
      </div>

      <div className="card mt-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold">
            <Icon name="users" className="text-brand-600" /> {t('admin.marketing.affiliateTitle')}
          </h2>
          {toggle(s, set, 'affiliate_enabled', t('admin.notify.enabled'))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {field(s, set, { k: 'affiliate_rate', label: t('admin.marketing.commissionRate'), type: 'number', help: t('admin.marketing.commissionHelp') })}
        </div>
        <p className="mt-3 text-xs text-gray-400">
          {t('admin.marketing.affiliateNote')}
        </p>
      </div>
    </div>
  );
}
