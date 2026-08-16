'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore, useMoney } from '@/components/Providers';
import { api } from '@/lib/client';

import Icon from '@/components/icons';
import { formatDateTime } from '@/lib/utils';
import { INTL_LOCALE } from '@/i18n';

type Txn = { id: number; type: string; amount: number; note: string | null; createdAt: string };

const TXN_META: Record<string, { label: string; icon: string; cls: string }> = {
  TOPUP: { label: 'Top-up', icon: 'plus', cls: 'bg-green-50 text-green-600' },
  PURCHASE: { label: 'Purchase', icon: 'cart', cls: 'bg-gray-100 text-gray-500' },
  COMMISSION: { label: 'Commission', icon: 'users', cls: 'bg-brand-50 text-brand-600' },
  REFUND: { label: 'Refund', icon: 'refresh', cls: 'bg-blue-50 text-blue-600' },
  ADJUST: { label: 'Adjustment', icon: 'settings', cls: 'bg-gray-100 text-gray-500' },
};

export default function WalletPage() {
  const { user, toast, refreshUser, locale } = useStore();
  const intlLocale = INTL_LOCALE[locale];
  const money = useMoney();
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [amount, setAmount] = useState('25');
  const [method, setMethod] = useState<'stripe' | 'paypal' | 'sepay' | 'payos' | 'bank'>('stripe');
  const [pay, setPay] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  const load = () =>
    api<{ balance: number; transactions: Txn[] }>('/api/wallet').then((d) => {
      setBalance(d.balance);
      setTxns(d.transactions);
    });

  useEffect(() => {
    if (user === null) router.replace('/login?next=/wallet');
    if (user) {
      load().catch(() => {});
      api<{ payments: Record<string, boolean> }>('/api/public/config')
        .then((d) => {
          setPay(d.payments);
          // Preselect something that is actually offered.
          if (d.payments.stripeEnabled) setMethod('stripe');
          else if (d.payments.paypalEnabled) setMethod('paypal');
          else if (d.payments.sepayEnabled) setMethod('sepay');
          else if (d.payments.payosEnabled) setMethod('payos');
          else if (d.payments.bankEnabled) setMethod('bank');
        })
        .catch(() => {});
      const status = new URLSearchParams(window.location.search).get('topup');
      if (status === 'success') { toast('Top-up received — balance updated'); refreshUser(); }
      if (status === 'cancelled') toast('Top-up was cancelled', 'error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const topup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const d = await api<{ redirectUrl: string }>('/api/wallet/topup', {
        method: 'POST',
        json: { amount: Number(amount), method },
      });
      window.location.href = d.redirectUrl;
    } catch (e: any) {
      toast(e.message, 'error');
      setBusy(false);
    }
  };

  if (!user || balance === null) {
    return <div className="container py-16 text-center text-gray-400">Loading wallet…</div>;
  }

  return (
    <div className="container max-w-4xl py-8">
      <p className="section-eyebrow">Account</p>
      <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Wallet</h1>
      <p className="mt-1 text-sm text-gray-500">
        Top up once, pay instantly at checkout — no card entry on every order.
      </p>

      <div className="mt-5 grid gap-5 lg:grid-cols-[380px_1fr]">
        {/* Balance + top-up */}
        <div className="space-y-5">
          <div className="card overflow-hidden">
            <div className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-purple-700 p-5 text-white">
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10" />
              <div className="pointer-events-none absolute -bottom-14 right-16 h-28 w-28 rounded-full bg-white/5" />
              <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Available balance</p>
              <p className="relative mt-1 text-3xl font-extrabold">{money(balance)}</p>
              <Icon name="credit-card" size={38} className="absolute bottom-4 right-4 text-white/25" />
            </div>
            <form onSubmit={topup} className="space-y-3 p-5">
              <div>
                <label className="label">Top-up amount (USD)</label>
                <div className="flex gap-2">
                  {['10', '25', '50', '100'].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setAmount(v)}
                      className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition ${
                        amount === v ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      ${v}
                    </button>
                  ))}
                </div>
                <input
                  className="input mt-2"
                  type="number"
                  min="5"
                  max="1000"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <p className="mt-1 text-xs text-gray-400">Between $5 and $1,000.</p>
              </div>
              <div>
                <label className="label">Payment method</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ['stripe', 'Card', 'credit-card', pay.stripeEnabled !== false],
                    ['paypal', 'PayPal', 'paypal', pay.paypalEnabled !== false],
                    ['sepay', 'Bank (instant)', 'bolt', !!pay.sepayEnabled],
                    ['payos', 'PayOS', 'credit-card', !!pay.payosEnabled],
                    ['bank', 'Bank (manual)', 'store', !!pay.bankEnabled],
                  ] as const)
                    .filter(([, , , enabled]) => enabled)
                    .map(([value, label, icon]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setMethod(value as any)}
                        className={`flex items-center justify-center gap-1.5 rounded-lg border py-2.5 text-sm font-semibold transition ${
                          method === value ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <Icon name={icon} size={16} /> {label}
                      </button>
                    ))}
                </div>
              </div>
              <button className="btn-primary w-full" disabled={busy}>
                <Icon name="plus" size={16} /> {busy ? 'Redirecting…' : 'Top up now'}
              </button>
            </form>
          </div>
        </div>

        {/* Transactions */}
        <div className="card">
          <h2 className="border-b border-gray-100 p-4 font-bold">Transaction history</h2>
          <div className="divide-y divide-gray-100">
            {txns.map((t) => {
              const meta = TXN_META[t.type] || TXN_META.ADJUST;
              return (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${meta.cls}`}>
                    <Icon name={meta.icon} size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{meta.label}</span>
                    <span className="block truncate text-xs text-gray-400">
                      {t.note || '—'} · {formatDateTime(t.createdAt, intlLocale, { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </span>
                  <span className={`text-sm font-bold ${t.amount >= 0 ? 'text-green-600' : 'text-gray-900'}`}>
                    {t.amount >= 0 ? '+' : ''}{money(t.amount)}
                  </span>
                </div>
              );
            })}
            {txns.length === 0 && <p className="px-4 py-10 text-center text-sm text-gray-400">No transactions yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
