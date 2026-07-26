'use client';

import Icon from '@/components/icons';
import { useSettings, field, toggle, SettingsHeader } from '../shared';

export default function AdminMarketingSettingsPage() {
  const { s, set, save, busy } = useSettings();
  if (!s) return <div className="py-16 text-center text-gray-400">Loading settings…</div>;

  return (
    <div>
      <SettingsHeader
        title="Rewards & affiliate"
        subtitle="Loyalty points earned on purchases and the referral commission program."
        onSave={save}
        busy={busy}
      />

      <div className="card mt-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold">
            <Icon name="star" className="text-amber-500" /> Loyalty points
          </h2>
          {toggle(s, set, 'loyalty_enabled', 'Enabled')}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {field(s, set, { k: 'loyalty_earn_rate', label: 'Points earned per $1 spent', type: 'number', help: 'e.g. 1 → a $20 order earns 20 points.' })}
          {field(s, set, { k: 'loyalty_redeem_value', label: 'Dollar value per point ($)', type: 'number', help: 'e.g. 0.01 → 100 points = $1 off.' })}
          {field(s, set, { k: 'loyalty_min_redeem', label: 'Minimum points to redeem', type: 'number' })}
        </div>
      </div>

      <div className="card mt-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold">
            <Icon name="users" className="text-brand-600" /> Affiliate program
          </h2>
          {toggle(s, set, 'affiliate_enabled', 'Enabled')}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {field(s, set, { k: 'affiliate_rate', label: 'Commission rate (%)', type: 'number', help: 'Percent of each paid order credited to the referrer’s wallet.' })}
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Customers find their referral link on the storefront under Account menu → Affiliate program.
          Attribution uses a 30-day cookie and applies at sign-up.
        </p>
      </div>
    </div>
  );
}
