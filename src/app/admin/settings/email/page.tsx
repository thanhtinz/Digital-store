'use client';

import Icon from '@/components/icons';
import { useState } from 'react';
import { useSettings, field, SettingsHeader } from '../shared';

const TEMPLATES = [
  ['order', 'Order confirmation'],
  ['delivery', 'Order delivered'],
  ['verify', 'Email verification'],
  ['reset', 'Password reset'],
  ['restock', 'Back in stock'],
  ['coupon', 'Personal coupon'],
  ['giftcard', 'Gift card'],
] as const;

export default function AdminEmailSettingsPage() {
  const { s, set, save, busy } = useSettings();
  const [preview, setPreview] = useState('order');
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

      {/* Template preview */}
      <div className="card mt-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold">
            <Icon name="eye" className="text-brand-600" /> Template preview
          </h2>
          <select className="input w-56" value={preview} onChange={(e) => setPreview(e.target.value)}>
            {TEMPLATES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Exactly what customers receive, rendered with sample data and your current site name.
        </p>
        <iframe
          key={preview}
          src={`/api/admin/email-preview?template=${preview}`}
          className="mt-4 h-[480px] w-full rounded-xl border border-gray-200 bg-white"
          title="Email preview"
        />
      </div>
    </div>
  );
}
