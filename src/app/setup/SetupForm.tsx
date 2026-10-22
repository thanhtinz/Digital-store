'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore, useT } from '@/components/Providers';
import { api } from '@/lib/client';
import { LOCALES, LOCALE_NAMES, type Locale } from '@/i18n';

// The wizard form itself. All validation that matters happens again on the
// server (/api/setup) — this only collects the values and surfaces errors.
export default function SetupForm() {
  const router = useRouter();
  const { locale, toast } = useStore();
  const t = useT();

  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');
  const [siteName, setSiteName] = useState('');
  const [tagline, setTagline] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [language, setLanguage] = useState<Locale>(locale);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/setup', {
        method: 'POST',
        json: {
          adminName,
          adminEmail,
          adminPassword,
          adminPasswordConfirm,
          siteName,
          tagline,
          supportEmail,
          currency,
          language,
        },
      });
      toast(t('setup.done'), 'success');
      // The session cookie is already set; land in the admin console.
      router.push('/admin');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card space-y-8 p-6 sm:p-8">
      <fieldset className="space-y-4">
        <legend className="section-eyebrow">{t('setup.adminTitle')}</legend>
        <div>
          <label className="label" htmlFor="setup-admin-name">{t('setup.adminName')}</label>
          <input
            id="setup-admin-name"
            className="input"
            value={adminName}
            onChange={(e) => setAdminName(e.target.value)}
            autoComplete="name"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="setup-admin-email">{t('setup.adminEmail')}</label>
          <input
            id="setup-admin-email"
            className="input"
            type="email"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="setup-admin-password">{t('setup.adminPassword')}</label>
            <input
              id="setup-admin-password"
              className="input"
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
            <p className="mt-1 text-xs text-gray-400">{t('setup.passwordHint')}</p>
          </div>
          <div>
            <label className="label" htmlFor="setup-admin-password-confirm">{t('setup.adminPasswordConfirm')}</label>
            <input
              id="setup-admin-password-confirm"
              className="input"
              type="password"
              value={adminPasswordConfirm}
              onChange={(e) => setAdminPasswordConfirm(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="section-eyebrow">{t('setup.siteTitle')}</legend>
        <div>
          <label className="label" htmlFor="setup-site-name">{t('setup.siteName')}</label>
          <input
            id="setup-site-name"
            className="input"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="setup-tagline">{t('setup.tagline')}</label>
          <input
            id="setup-tagline"
            className="input"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="setup-support-email">{t('setup.supportEmail')}</label>
          <input
            id="setup-support-email"
            className="input"
            type="email"
            value={supportEmail}
            onChange={(e) => setSupportEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="setup-currency">{t('setup.currency')}</label>
            <input
              id="setup-currency"
              className="input"
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
              placeholder="USD"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="setup-language">{t('setup.language')}</label>
            <select
              id="setup-language"
              className="input"
              value={language}
              onChange={(e) => setLanguage(e.target.value as Locale)}
            >
              {LOCALES.map((l) => (
                <option key={l} value={l}>{LOCALE_NAMES[l]}</option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? t('setup.submitting') : t('setup.submit')}
      </button>
    </form>
  );
}
