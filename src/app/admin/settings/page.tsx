'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/components/Providers';
import { api } from '@/lib/client';

type Settings = Record<string, string>;

export default function AdminSettingsPage() {
  const { toast } = useStore();
  const [s, setS] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState('');
  const [tab, setTab] = useState<'site' | 'payments' | 'auth' | 'email'>('site');

  useEffect(() => {
    api<{ settings: Settings }>('/api/admin/settings').then((d) => setS(d.settings)).catch(() => {});
  }, []);

  if (!s) return <div className="py-16 text-center text-gray-400">Loading settings…</div>;

  const set = (key: string, value: string) => setS((prev) => ({ ...prev!, [key]: value }));

  const save = async () => {
    setBusy(true);
    try {
      await api('/api/admin/settings', { method: 'POST', json: s });
      toast('Settings saved');
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const test = async (gateway: string) => {
    setTesting(gateway);
    try {
      const d = await api<{ message: string }>('/api/admin/settings/test', { method: 'POST', json: { gateway } });
      toast(d.message);
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setTesting('');
    }
  };

  const Field = ({ k, label, type = 'text', placeholder, help }: { k: string; label: string; type?: string; placeholder?: string; help?: string }) => (
    <div>
      <label className="label">{label}</label>
      <input className="input" type={type} placeholder={placeholder} value={s[k] ?? ''} onChange={(e) => set(k, e.target.value)} />
      {help && <p className="mt-1 text-xs text-gray-400">{help}</p>}
    </div>
  );

  const Toggle = ({ k, label }: { k: string; label: string }) => (
    <label className="flex items-center gap-2 text-sm font-medium">
      <input type="checkbox" checked={s[k] === 'true'} onChange={(e) => set(k, e.target.checked ? 'true' : 'false')} />
      {label}
    </label>
  );

  const webhookBase = s.app_url || (typeof window !== 'undefined' ? window.location.origin : '');

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Settings</h1>
        <button className="btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save all settings'}</button>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto border-b border-gray-200">
        {([['site', '🏪 Site'], ['payments', '💳 Payments'], ['auth', '🔑 Google login'], ['email', '📧 Email (SMTP)']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-semibold ${tab === key ? 'border-b-2 border-brand-600 text-brand-700' : 'text-gray-500'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'site' && (
        <div className="card mt-5 grid gap-4 p-5 sm:grid-cols-2">
          {Field({ k: 'site_name', label: 'Site name' })}
          {Field({ k: 'site_tagline', label: 'Tagline' })}
          {Field({ k: 'site_logo', label: 'Logo URL', placeholder: '/api/media/1 or https://…' })}
          {Field({ k: 'currency', label: 'Currency (ISO code)', help: 'USD, EUR, GBP… affects prices and payment gateways.' })}
          {Field({ k: 'support_email', label: 'Support email' })}
          {Field({ k: 'app_url', label: 'Public site URL', placeholder: 'https://yourstore.com', help: 'Used in emails and payment redirects.' })}
          <div className="sm:col-span-2">{Field({ k: 'footer_text', label: 'Footer text' })}</div>
          {Toggle({ k: 'require_email_verification', label: 'Require email verification for new accounts' })}
        </div>
      )}

      {tab === 'payments' && (
        <div className="mt-5 space-y-5">
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">💳 Stripe — card payments (Visa, Mastercard, Amex)</h2>
              {Toggle({ k: 'stripe_enabled', label: 'Enabled' })}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {Field({ k: 'stripe_secret_key', label: 'Secret key', type: 'password', placeholder: 'sk_live_…' })}
              {Field({ k: 'stripe_publishable_key', label: 'Publishable key', placeholder: 'pk_live_…' })}
              {Field({ k: 'stripe_webhook_secret', label: 'Webhook signing secret', type: 'password', placeholder: 'whsec_…' })}
              <div>
                <label className="label">Webhook endpoint (add in Stripe dashboard)</label>
                <code className="block select-all rounded-lg bg-gray-100 px-3 py-2.5 text-xs">{webhookBase}/api/webhooks/stripe</code>
                <p className="mt-1 text-xs text-gray-400">Event to send: checkout.session.completed</p>
              </div>
            </div>
            <button className="btn-secondary mt-4 text-xs" onClick={() => test('stripe')} disabled={testing === 'stripe'}>
              {testing === 'stripe' ? 'Testing…' : 'Test connection'}
            </button>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">🅿️ PayPal</h2>
              {Toggle({ k: 'paypal_enabled', label: 'Enabled' })}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {Field({ k: 'paypal_client_id', label: 'Client ID' })}
              {Field({ k: 'paypal_client_secret', label: 'Client secret', type: 'password' })}
              <div>
                <label className="label">Mode</label>
                <select className="input" value={s.paypal_mode || 'sandbox'} onChange={(e) => set('paypal_mode', e.target.value)}>
                  <option value="sandbox">Sandbox (testing)</option>
                  <option value="live">Live</option>
                </select>
              </div>
            </div>
            <button className="btn-secondary mt-4 text-xs" onClick={() => test('paypal')} disabled={testing === 'paypal'}>
              {testing === 'paypal' ? 'Testing…' : 'Test connection'}
            </button>
          </div>
        </div>
      )}

      {tab === 'auth' && (
        <div className="card mt-5 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Google OAuth login</h2>
            {Toggle({ k: 'google_login_enabled', label: 'Enabled' })}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {Field({ k: 'google_client_id', label: 'Client ID' })}
            {Field({ k: 'google_client_secret', label: 'Client secret', type: 'password' })}
            <div className="sm:col-span-2">
              <label className="label">Authorized redirect URI (add in Google Cloud console)</label>
              <code className="block select-all rounded-lg bg-gray-100 px-3 py-2.5 text-xs">{webhookBase}/api/auth/google/callback</code>
            </div>
          </div>
        </div>
      )}

      {tab === 'email' && (
        <div className="card mt-5 grid gap-4 p-5 sm:grid-cols-2">
          {Field({ k: 'smtp_host', label: 'SMTP host', placeholder: 'smtp.resend.com' })}
          {Field({ k: 'smtp_port', label: 'SMTP port', placeholder: '587' })}
          {Field({ k: 'smtp_user', label: 'SMTP username' })}
          {Field({ k: 'smtp_pass', label: 'SMTP password', type: 'password' })}
          <div className="sm:col-span-2">
            {Field({ k: 'smtp_from', label: 'From address', placeholder: 'Digital Store <no-reply@yourstore.com>', help: 'Used for verification, password reset and order receipt emails. Leave host empty to log emails to the server console (dev mode).' })}
          </div>
        </div>
      )}
    </div>
  );
}
