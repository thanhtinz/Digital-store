'use client';

import { useState } from 'react';
import { api } from '@/lib/client';
import { useAdminT } from '@/components/Providers';
import Icon from '@/components/icons';
import { useSettings, field, toggle, SettingsHeader, webhookBase } from '../shared';

export default function AdminPaymentSettingsPage() {
  const { s, set, save, busy, toast } = useSettings();
  const t = useAdminT();
  const [testing, setTesting] = useState('');
  if (!s) return <div className="py-16 text-center text-gray-400">{t('admin.settings.loading')}</div>;

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
        title={t('admin.payset.title')}
        subtitle={t('admin.payset.subtitle')}
        onSave={save}
        busy={busy}
      />

      <div className="card mt-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold">
            <Icon name="credit-card" className="text-brand-600" />
            Stripe — {t('admin.payset.stripeTitle')}
          </h2>
          {toggle(s, set, 'stripe_enabled', t('admin.notify.enabled'))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {field(s, set, { k: 'stripe_secret_key', label: t('admin.payset.secretKey'), type: 'password', placeholder: 'sk_live_…' })}
          {field(s, set, { k: 'stripe_publishable_key', label: t('admin.payset.publishableKey'), placeholder: 'pk_live_…' })}
          {field(s, set, { k: 'stripe_webhook_secret', label: t('admin.payset.webhookSecret'), type: 'password', placeholder: 'whsec_…' })}
          <div>
            <label className="label">{t('admin.payset.webhookEndpoint')}</label>
            <code className="block select-all rounded-lg bg-gray-100 px-3 py-2.5 text-xs">{webhookBase(s)}/api/webhooks/stripe</code>
            <p className="mt-1 text-xs text-gray-400">{t('admin.payset.stripeEvent')}</p>
          </div>
        </div>
        <button className="btn-secondary mt-4 text-xs" onClick={() => test('stripe')} disabled={testing === 'stripe'}>
          {testing === 'stripe' ? t('admin.payset.testing') : t('admin.payset.testConnection')}
        </button>
      </div>

      <div className="card mt-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold">
            <Icon name="paypal" className="text-blue-700" />
            PayPal
          </h2>
          {toggle(s, set, 'paypal_enabled', t('admin.notify.enabled'))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {field(s, set, { k: 'paypal_client_id', label: 'Client ID' })}
          {field(s, set, { k: 'paypal_client_secret', label: t('admin.payset.clientSecret'), type: 'password' })}
          <div>
            <label className="label">{t('admin.payset.mode')}</label>
            <select className="input" value={s.paypal_mode || 'sandbox'} onChange={(e) => set('paypal_mode', e.target.value)}>
              <option value="sandbox">{t('admin.payset.sandbox')}</option>
              <option value="live">Live</option>
            </select>
          </div>
        </div>
        <button className="btn-secondary mt-4 text-xs" onClick={() => test('paypal')} disabled={testing === 'paypal'}>
          {testing === 'paypal' ? t('admin.payset.testing') : t('admin.payset.testConnection')}
        </button>
      </div>

      {/* ── Vietnamese methods ─────────────────────────────────── */}
      <div className="mt-8">
        <p className="section-eyebrow">{t('admin.payset.vietnam')}</p>
        <h2 className="mt-1 text-lg font-bold">{t('admin.payset.bankMethods')}</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          {t('admin.payset.bankMethodsText', { currency: s.payment_currency || 'VND' })}
        </p>
      </div>

      <div className="card mt-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold">
            <Icon name="bolt" className="text-emerald-600" />
            SePay — {t('admin.payset.sepayTitle')}
          </h2>
          {toggle(s, set, 'sepay_enabled', t('admin.notify.enabled'))}
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {t('admin.payset.sepayText')}
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {field(s, set, { k: 'sepay_webhook_key', label: t('admin.payset.webhookApiKey'), type: 'password', help: 'SePay: Authorization: Apikey <key>' })}
          {field(s, set, { k: 'sepay_bank_code', label: t('admin.payset.bankCode'), placeholder: 'MB, VCB, TCB…', help: t('admin.payset.bankCodeHelp') })}
          {field(s, set, { k: 'sepay_bank_name', label: t('admin.payset.bankName'), placeholder: 'MB Bank' })}
          {field(s, set, { k: 'sepay_account_number', label: t('admin.payset.accountNumber') })}
          {field(s, set, { k: 'sepay_account_name', label: t('admin.payset.accountName') })}
          {field(s, set, { k: 'sepay_instructions', label: t('admin.payset.extraInstructions'), placeholder: t('admin.payset.instructionsPlaceholder') })}
          <div className="sm:col-span-2">
            <label className="label">{t('admin.payset.webhookUrl')}</label>
            <code className="block select-all rounded-lg bg-gray-100 px-3 py-2.5 text-xs">{webhookBase(s)}/api/webhooks/sepay</code>
            <p className="mt-1 text-xs text-gray-400">{t('admin.payset.sepayWebhookHelp')}</p>
          </div>
        </div>
      </div>

      <div className="card mt-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold">
            <Icon name="credit-card" className="text-blue-600" />
            PayOS — {t('admin.payset.payosTitle')}
          </h2>
          {toggle(s, set, 'payos_enabled', t('admin.notify.enabled'))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {field(s, set, { k: 'payos_client_id', label: 'Client ID' })}
          {field(s, set, { k: 'payos_api_key', label: 'API key', type: 'password' })}
          {field(s, set, { k: 'payos_checksum_key', label: t('admin.payset.checksumKey'), type: 'password', help: t('admin.payset.checksumHelp') })}
          {field(s, set, { k: 'payos_api_base', label: 'API base URL' })}
          <div className="sm:col-span-2">
            <label className="label">{t('admin.payset.webhookUrl')}</label>
            <code className="block select-all rounded-lg bg-gray-100 px-3 py-2.5 text-xs">{webhookBase(s)}/api/webhooks/payos</code>
          </div>
        </div>
      </div>

      <div className="card mt-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold">
            <Icon name="store" className="text-amber-600" />
            {t('admin.payset.manualTitle')}
          </h2>
          {toggle(s, set, 'bank_transfer_enabled', t('admin.notify.enabled'))}
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {t('admin.payset.manualText')}
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {field(s, set, { k: 'bank_transfer_bank_name', label: t('admin.payset.bankName') })}
          {field(s, set, { k: 'bank_transfer_bank_code', label: t('admin.payset.bankCode'), placeholder: 'MB, VCB, TCB…' })}
          {field(s, set, { k: 'bank_transfer_account_number', label: t('admin.payset.accountNumber') })}
          {field(s, set, { k: 'bank_transfer_account_name', label: t('admin.payset.accountName') })}
          {field(s, set, { k: 'bank_transfer_instructions', label: t('admin.payset.extraInstructions') })}
        </div>
      </div>

      <div className="card mt-5 p-5">
        <h2 className="font-bold">{t('admin.payset.refsTitle')}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {field(s, set, { k: 'payment_ref_prefix', label: t('admin.payset.refPrefix'), help: t('admin.payset.refPrefixHelp') })}
          {field(s, set, { k: 'payment_ref_base', label: t('admin.payset.refBase'), type: 'number', help: t('admin.payset.refBaseHelp') })}
          {field(s, set, { k: 'payment_expiry_minutes', label: t('admin.payset.expiry'), type: 'number' })}
        </div>
      </div>
    </div>
  );
}
