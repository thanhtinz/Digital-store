'use client';

import Icon from '@/components/icons';
import { useSettings, field, SettingsHeader } from '../shared';

export default function AdminEmailSettingsPage() {
  const { s, set, save, busy } = useSettings();
  if (!s) return <div className="py-16 text-center text-gray-400">Loading settings…</div>;

  return (
    <div>
      <SettingsHeader
        title="Email (SMTP)"
        subtitle="Transactional email: verification, password resets and order receipts."
        onSave={save}
        busy={busy}
      />
      <div className="card mt-5 p-5">
        <h2 className="flex items-center gap-2 font-bold">
          <Icon name="mail" className="text-brand-600" />
          SMTP server
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {field(s, set, { k: 'smtp_host', label: 'SMTP host', placeholder: 'smtp.resend.com' })}
          {field(s, set, { k: 'smtp_port', label: 'SMTP port', placeholder: '587' })}
          {field(s, set, { k: 'smtp_user', label: 'SMTP username' })}
          {field(s, set, { k: 'smtp_pass', label: 'SMTP password', type: 'password' })}
          <div className="sm:col-span-2">
            {field(s, set, {
              k: 'smtp_from',
              label: 'From address',
              placeholder: 'Digital Store <no-reply@yourstore.com>',
              help: 'Leave the host empty to log emails to the server console instead (development mode).',
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
