'use client';

import { useState } from 'react';
import { useAdminT, useStore } from '@/components/Providers';
import Icon from '@/components/icons';
import { useSettings, field, toggle, SettingsHeader } from './shared';

export default function AdminSiteSettingsPage() {
  const { s, set, save, busy } = useSettings();
  const { toast } = useStore();
  const t = useAdminT();
  const [uploading, setUploading] = useState(false);
  if (!s) return <div className="py-16 text-center text-gray-400">{t('admin.settings.loading')}</div>;

  const uploadLogo = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('admin.editor.uploadFailed'));
      set('site_logo', data.url);
      toast(t('admin.site.logoUploaded'));
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <SettingsHeader
        title={t('admin.site.title')}
        subtitle={t('admin.site.subtitle')}
        onSave={save}
        busy={busy}
      />

      <div className="card mt-5 grid gap-4 p-5 sm:grid-cols-2">
        {field(s, set, { k: 'site_name', label: t('admin.site.siteName') })}
        {field(s, set, { k: 'site_tagline', label: t('admin.site.tagline') })}

        {/* Logo image */}
        <div className="sm:col-span-2">
          <label className="label">{t('admin.site.logo')}</label>
          <div className="flex flex-wrap items-center gap-4">
            {s.site_logo ? (
              <span className="relative rounded-xl border border-gray-200 bg-gray-50 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.site_logo} alt="logo" className="h-10 w-auto max-w-[180px] object-contain" />
                <button
                  className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-gray-900 text-white"
                  onClick={() => set('site_logo', '')}
                  aria-label={t('admin.site.removeLogo')}
                >
                  <Icon name="x" size={12} />
                </button>
              </span>
            ) : (
              <span className="grid h-16 w-28 place-items-center rounded-xl border border-dashed border-gray-300 text-xs text-gray-400">
                {t('admin.site.noLogo')}
              </span>
            )}
            <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 hover:border-brand-400 hover:text-brand-600">
              <Icon name="upload" size={16} /> {uploading ? t('admin.banners.uploading') : s.site_logo ? t('admin.posts.replaceImage') : t('admin.banners.upload')}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) uploadLogo(e.target.files[0]); e.target.value = ''; }}
              />
            </label>
          </div>
          <p className="mt-1.5 text-xs text-gray-400">
            {t('admin.site.logoHelp')}
          </p>
        </div>

        {field(s, set, { k: 'currency', label: t('admin.site.currency'), help: t('admin.site.currencyHelp') })}
        {field(s, set, { k: 'app_url', label: t('admin.site.appUrl'), placeholder: 'https://yourstore.com', help: t('admin.site.appUrlHelp') })}
        {field(s, set, { k: 'indexnow_key', label: t('admin.site.indexnow'), placeholder: t('admin.site.indexnowPlaceholder'), help: t('admin.site.indexnowHelp') })}
        {toggle(s, set, 'require_email_verification', t('admin.site.requireVerify'))}
      </div>

      {/* Footer content */}
      <div className="card mt-5 p-5">
        <h2 className="font-bold">{t('admin.site.footer')}</h2>
        <p className="mt-0.5 text-xs text-gray-500">{t('admin.site.footerHelp')}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            {field(s, set, { k: 'footer_about', label: t('admin.site.aboutText'), placeholder: t('admin.site.aboutPlaceholder') })}
          </div>
          {field(s, set, { k: 'support_email', label: t('admin.site.supportEmail') })}
          {field(s, set, { k: 'footer_text', label: t('admin.site.copyright'), placeholder: t('admin.site.copyrightPlaceholder') })}
        </div>

        <h3 className="mt-6 text-sm font-bold">{t('admin.site.social')}</h3>
        <p className="mt-0.5 text-xs text-gray-500">{t('admin.site.socialHelp')}</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {field(s, set, { k: 'social_facebook', label: 'Facebook', placeholder: 'https://facebook.com/yourpage' })}
          {field(s, set, { k: 'social_twitter', label: 'X (Twitter)', placeholder: 'https://x.com/yourhandle' })}
          {field(s, set, { k: 'social_instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourhandle' })}
          {field(s, set, { k: 'social_youtube', label: 'YouTube', placeholder: 'https://youtube.com/@yourchannel' })}
          {field(s, set, { k: 'social_telegram', label: 'Telegram', placeholder: 'https://t.me/yourchannel' })}
          {field(s, set, { k: 'social_discord', label: 'Discord', placeholder: 'https://discord.gg/yourinvite' })}
        </div>
      </div>
    </div>
  );
}
