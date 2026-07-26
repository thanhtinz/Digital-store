'use client';

import { useState } from 'react';
import { api } from '@/lib/client';
import Icon from '@/components/icons';
import { useSettings, field, toggle, SettingsHeader, webhookBase } from '../shared';

export default function AdminPaymentSettingsPage() {
  const { s, set, save, busy, toast } = useSettings();
  const [testing, setTesting] = useState('');
  if (!s) return <div className="py-16 text-center text-gray-400">Loading settings…</div>;

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

  return (
    <div>
      <SettingsHeader
        title="Payment methods"
        subtitle="Configure how customers pay — card payments via Stripe, and PayPal."
        onSave={save}
        busy={busy}
      />

      <div className="card mt-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold">
            <Icon name="credit-card" className="text-brand-600" />
            Stripe — card payments (Visa, Mastercard, Amex)
          </h2>
          {toggle(s, set, 'stripe_enabled', 'Enabled')}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {field(s, set, { k: 'stripe_secret_key', label: 'Secret key', type: 'password', placeholder: 'sk_live_…' })}
          {field(s, set, { k: 'stripe_publishable_key', label: 'Publishable key', placeholder: 'pk_live_…' })}
          {field(s, set, { k: 'stripe_webhook_secret', label: 'Webhook signing secret', type: 'password', placeholder: 'whsec_…' })}
          <div>
            <label className="label">Webhook endpoint (add in Stripe dashboard)</label>
            <code className="block select-all rounded-lg bg-gray-100 px-3 py-2.5 text-xs">{webhookBase(s)}/api/webhooks/stripe</code>
            <p className="mt-1 text-xs text-gray-400">Event to send: checkout.session.completed</p>
          </div>
        </div>
        <button className="btn-secondary mt-4 text-xs" onClick={() => test('stripe')} disabled={testing === 'stripe'}>
          {testing === 'stripe' ? 'Testing…' : 'Test connection'}
        </button>
      </div>

      <div className="card mt-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold">
            <Icon name="paypal" className="text-blue-700" />
            PayPal
          </h2>
          {toggle(s, set, 'paypal_enabled', 'Enabled')}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {field(s, set, { k: 'paypal_client_id', label: 'Client ID' })}
          {field(s, set, { k: 'paypal_client_secret', label: 'Client secret', type: 'password' })}
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
  );
}
