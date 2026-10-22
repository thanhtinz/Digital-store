'use client';

import Icon from '@/components/icons';
import { useSettings, field, toggle, SettingsHeader, webhookBase } from '../shared';
import { useAdminT } from '@/components/Providers';

export default function AdminGoogleSettingsPage() {
  const { s, set, save, busy } = useSettings();
  const t = useAdminT();
  if (!s) return <div className="py-16 text-center text-gray-400">{t('admin.settings.loading')}</div>;

  return (
    <div>
      <SettingsHeader
        title={t('admin.google.title')}
        subtitle={t('admin.google.subtitle')}
        onSave={save}
        busy={busy}
      />
      <div className="card mt-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold">
            <Icon name="key" className="text-brand-600" />
            {t('admin.google.credentials')}
          </h2>
          {toggle(s, set, 'google_login_enabled', t('admin.notify.enabled'))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {field(s, set, { k: 'google_client_id', label: 'Client ID' })}
          {field(s, set, { k: 'google_client_secret', label: t('admin.payset.clientSecret'), type: 'password' })}
          <div className="sm:col-span-2">
            <label className="label">{t('admin.google.redirectUri')}</label>
            <code className="block select-all rounded-lg bg-gray-100 px-3 py-2.5 text-xs">{webhookBase(s)}/api/auth/google/callback</code>
          </div>
        </div>
      </div>
    </div>
  );
}
