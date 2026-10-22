'use client';

import Icon from '@/components/icons';
import { useState } from 'react';
import { useSettings, field, SettingsHeader } from '../shared';
import { useAdminT } from '@/components/Providers';

const TEMPLATES = [
  ['order', 'admin.email.tplOrder'],
  ['delivery', 'admin.email.tplDelivery'],
  ['verify', 'admin.email.tplVerify'],
  ['reset', 'admin.email.tplReset'],
  ['restock', 'admin.email.tplRestock'],
  ['coupon', 'admin.email.tplCoupon'],
  ['giftcard', 'admin.email.tplGiftcard'],
] as const;

export default function AdminEmailSettingsPage() {
  const { s, set, save, busy } = useSettings();
  const t = useAdminT();
  const [preview, setPreview] = useState('order');
  if (!s) return <div className="py-16 text-center text-gray-400">{t('admin.settings.loading')}</div>;

  return (
    <div>
      <SettingsHeader
        title={t('admin.email.title')}
        subtitle={t('admin.email.subtitle')}
        onSave={save}
        busy={busy}
      />
      <div className="card mt-5 p-5">
        <h2 className="flex items-center gap-2 font-bold">
          <Icon name="mail" className="text-brand-600" />
          {t('admin.email.smtpTitle')}
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {field(s, set, { k: 'smtp_host', label: 'SMTP host', placeholder: 'smtp.resend.com' })}
          {field(s, set, { k: 'smtp_port', label: 'SMTP port', placeholder: '587' })}
          {field(s, set, { k: 'smtp_user', label: t('admin.email.smtpUser') })}
          {field(s, set, { k: 'smtp_pass', label: t('admin.email.smtpPass'), type: 'password' })}
          <div className="sm:col-span-2">
            {field(s, set, {
              k: 'smtp_from',
              label: t('admin.email.fromAddress'),
              placeholder: 'Digital Store <no-reply@yourstore.com>',
              help: t('admin.email.fromHelp'),
            })}
          </div>
        </div>
      </div>

      {/* {t('admin.email.previewTitle')} */}
      <div className="card mt-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold">
            <Icon name="eye" className="text-brand-600" /> {t('admin.email.previewTitle')}
          </h2>
          <select className="input w-56" value={preview} onChange={(e) => setPreview(e.target.value)}>
            {TEMPLATES.map(([value, label]) => (
              <option key={value} value={value}>{t(label)}</option>
            ))}
          </select>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          {t('admin.email.previewText')}
        </p>
        <iframe
          key={preview}
          src={`/api/admin/email-preview?template=${preview}`}
          className="mt-4 h-[480px] w-full rounded-xl border border-gray-200 bg-white"
          title={t('admin.email.previewTitle')}
        />
      </div>
    </div>
  );
}
