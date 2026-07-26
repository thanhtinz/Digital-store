'use client';

import { useSettings, field, toggle, SettingsHeader } from './shared';

export default function AdminSiteSettingsPage() {
  const { s, set, save, busy } = useSettings();
  if (!s) return <div className="py-16 text-center text-gray-400">Loading settings…</div>;

  return (
    <div>
      <SettingsHeader
        title="Site settings"
        subtitle="Store identity, currency and account policy."
        onSave={save}
        busy={busy}
      />
      <div className="card mt-5 grid gap-4 p-5 sm:grid-cols-2">
        {field(s, set, { k: 'site_name', label: 'Site name' })}
        {field(s, set, { k: 'site_tagline', label: 'Tagline' })}
        {field(s, set, { k: 'site_logo', label: 'Logo URL', placeholder: '/api/media/1 or https://…' })}
        {field(s, set, { k: 'currency', label: 'Currency (ISO code)', help: 'USD, EUR, GBP… affects prices and payment gateways.' })}
        {field(s, set, { k: 'support_email', label: 'Support email' })}
        {field(s, set, { k: 'app_url', label: 'Public site URL', placeholder: 'https://yourstore.com', help: 'Used in emails, OAuth and payment redirects.' })}
        <div className="sm:col-span-2">{field(s, set, { k: 'footer_text', label: 'Footer text' })}</div>
        {toggle(s, set, 'require_email_verification', 'Require email verification for new accounts')}
      </div>
    </div>
  );
}
