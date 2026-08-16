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

      {/* ── Vietnamese methods ─────────────────────────────────── */}
      <div className="mt-8">
        <p className="section-eyebrow">Vietnam</p>
        <h2 className="mt-1 text-lg font-bold">Bank transfer methods</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          These collect in {s.payment_currency || 'VND'} using the exchange rate set under Currency. The rate is frozen
          onto each payment when it is created.
        </p>
      </div>

      <div className="card mt-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold">
            <Icon name="bolt" className="text-emerald-600" />
            SePay — automatic bank transfer
          </h2>
          {toggle(s, set, 'sepay_enabled', 'Enabled')}
        </div>
        <p className="mt-1 text-sm text-gray-500">
          SePay watches your bank account and calls us the moment a transfer lands, so orders confirm themselves.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {field(s, set, { k: 'sepay_webhook_key', label: 'Webhook API key', type: 'password', help: 'SePay sends this as: Authorization: Apikey <key>' })}
          {field(s, set, { k: 'sepay_bank_code', label: 'Bank code', placeholder: 'MB, VCB, TCB…', help: 'VietQR bank code, used to build the QR image.' })}
          {field(s, set, { k: 'sepay_bank_name', label: 'Bank name', placeholder: 'MB Bank' })}
          {field(s, set, { k: 'sepay_account_number', label: 'Account number' })}
          {field(s, set, { k: 'sepay_account_name', label: 'Account holder' })}
          {field(s, set, { k: 'sepay_instructions', label: 'Extra instructions', placeholder: 'Shown on the transfer screen' })}
          <div className="sm:col-span-2">
            <label className="label">Webhook URL</label>
            <code className="block select-all rounded-lg bg-gray-100 px-3 py-2.5 text-xs">{webhookBase(s)}/api/webhooks/sepay</code>
            <p className="mt-1 text-xs text-gray-400">Add this in SePay with API Key authentication.</p>
          </div>
        </div>
      </div>

      <div className="card mt-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold">
            <Icon name="credit-card" className="text-blue-600" />
            PayOS — hosted payment page
          </h2>
          {toggle(s, set, 'payos_enabled', 'Enabled')}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {field(s, set, { k: 'payos_client_id', label: 'Client ID' })}
          {field(s, set, { k: 'payos_api_key', label: 'API key', type: 'password' })}
          {field(s, set, { k: 'payos_checksum_key', label: 'Checksum key', type: 'password', help: 'Signs outgoing requests and verifies incoming webhooks.' })}
          {field(s, set, { k: 'payos_api_base', label: 'API base URL' })}
          <div className="sm:col-span-2">
            <label className="label">Webhook URL</label>
            <code className="block select-all rounded-lg bg-gray-100 px-3 py-2.5 text-xs">{webhookBase(s)}/api/webhooks/payos</code>
          </div>
        </div>
      </div>

      <div className="card mt-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold">
            <Icon name="store" className="text-amber-600" />
            Manual bank transfer
          </h2>
          {toggle(s, set, 'bank_transfer_enabled', 'Enabled')}
        </div>
        <p className="mt-1 text-sm text-gray-500">
          The customer transfers and tells us; you confirm it under Payment reviews.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {field(s, set, { k: 'bank_transfer_bank_name', label: 'Bank name' })}
          {field(s, set, { k: 'bank_transfer_bank_code', label: 'Bank code', placeholder: 'MB, VCB, TCB…' })}
          {field(s, set, { k: 'bank_transfer_account_number', label: 'Account number' })}
          {field(s, set, { k: 'bank_transfer_account_name', label: 'Account holder' })}
          {field(s, set, { k: 'bank_transfer_instructions', label: 'Extra instructions' })}
        </div>
      </div>

      <div className="card mt-5 p-5">
        <h2 className="font-bold">Transfer references</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {field(s, set, { k: 'payment_ref_prefix', label: 'Reference prefix', help: 'Customers type this plus a number, e.g. DH100231.' })}
          {field(s, set, { k: 'payment_ref_base', label: 'Reference start number', type: 'number', help: 'Raise this if you reset the database but keep the same PayOS account.' })}
          {field(s, set, { k: 'payment_expiry_minutes', label: 'Payment window (minutes)', type: 'number' })}
        </div>
      </div>
    </div>
  );
}
