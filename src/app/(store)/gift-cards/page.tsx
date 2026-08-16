'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore, useMoney, useT } from '@/components/Providers';
import { api } from '@/lib/client';

import Icon from '@/components/icons';
import { formatDate } from '@/lib/utils';
import { INTL_LOCALE } from '@/i18n';

type Card = { id: number; code: string | null; amount: number; status: string; createdAt: string };
type Pay = { stripeEnabled: boolean; paypalEnabled: boolean; sepayEnabled?: boolean; payosEnabled?: boolean; bankEnabled?: boolean };

const PRESETS = [10, 25, 50, 100];
const MIN = 5;
const MAX = 500;

export default function GiftCardsPage() {
  const { user, toast, refreshUser, locale, money: fmt } = useStore();
  const intlLocale = INTL_LOCALE[locale];
  const money = useMoney();
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const [cards, setCards] = useState<Card[]>([]);
  const [pay, setPay] = useState<Pay | null>(null);
  const [walletOn, setWalletOn] = useState(true);
  const [amount, setAmount] = useState('25');
  const [method, setMethod] = useState('stripe');
  const [buyBusy, setBuyBusy] = useState(false);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemBusy, setRedeemBusy] = useState(false);

  useEffect(() => {
    if (user === null) router.replace('/login?next=/gift-cards');
    if (user) {
      api<{ cards: Card[] }>('/api/gift-cards').then((d) => setCards(d.cards)).catch(() => {});
      api<{ payments: Pay; features?: Record<string, boolean> }>('/api/public/config')
        .then((d) => {
          setPay(d.payments);
          const wallet = d.features?.wallet !== false;
          setWalletOn(wallet);
          if (d.payments.stripeEnabled) setMethod('stripe');
          else if (d.payments.paypalEnabled) setMethod('paypal');
          else if (wallet) setMethod('balance');
        })
        .catch(() => setPay({ stripeEnabled: false, paypalEnabled: false }));
    }
  }, [user, router]);

  useEffect(() => {
    const flag = params.get('purchase');
    if (flag === 'success') toast(t('gift.purchased'));
    if (flag === 'pending') toast(t('gift.paymentPending'));
    if (flag === 'error') toast(t('gift.paymentFailed'), 'error');
  }, [params, toast, t]);

  if (!user) return <div className="container py-16 text-center text-gray-400">{t('common.loading')}</div>;

  const buy = async () => {
    setBuyBusy(true);
    try {
      const d = await api<{ paid?: boolean; redirectUrl?: string }>('/api/gift-cards', {
        method: 'POST',
        json: { amount: Number(amount), method },
      });
      if (d.redirectUrl) {
        window.location.href = d.redirectUrl;
        return;
      }
      toast(t('gift.purchased'));
      await refreshUser();
      await api<{ cards: Card[] }>('/api/gift-cards').then((x) => setCards(x.cards));
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBuyBusy(false);
    }
  };

  const redeem = async () => {
    setRedeemBusy(true);
    try {
      const d = await api<{ amount: number }>('/api/gift-cards/redeem', { method: 'POST', json: { code: redeemCode } });
      toast(t('gift.redeemed', { amount: money(d.amount) }));
      setRedeemCode('');
      await refreshUser();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setRedeemBusy(false);
    }
  };

  const copy = async (code: string) => {
    await navigator.clipboard.writeText(code);
    toast(t('gift.codeCopied'));
  };

  return (
    <div className="container py-8">
      <p className="section-eyebrow">{t('gift.eyebrow')}</p>
      <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{t('gift.title')}</h1>
      <p className="mt-1 text-sm text-gray-500">{t('gift.intro')}</p>

      <div className="mt-5 grid gap-5 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5">
          {/* Buy */}
          <div className="card overflow-hidden">
            <div className="relative overflow-hidden bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400 p-5 text-white">
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10" />
              <p className="text-xs font-semibold uppercase tracking-wider text-white/80">{t('gift.digital')}</p>
              <p className="relative mt-1 text-3xl font-extrabold">{money(Number(amount) || 0)}</p>
              <Icon name="gift" size={38} className="absolute bottom-4 right-4 text-white/30" />
            </div>
            <div className="space-y-3 p-5">
              <div>
                <label className="label">{t('gift.amountLabel', { currency: fmt.code })}</label>
                <div className="flex gap-2">
                  {PRESETS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setAmount(String(v))}
                      className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition ${
                        amount === String(v) ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {money(v)}
                    </button>
                  ))}
                </div>
                <input className="input mt-2" type="number" min={MIN} max={MAX} value={amount} onChange={(e) => setAmount(e.target.value)} />
                <p className="mt-1 text-xs text-gray-400">{t('gift.range', { min: money(MIN), max: money(MAX) })}</p>
              </div>
              <div>
                <label className="label">{t('checkout.paymentMethod')}</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {([
                    ['stripe', t('wallet.methodCard'), pay?.stripeEnabled],
                    ['paypal', 'PayPal', pay?.paypalEnabled],
                    ['balance', t('wallet.methodWallet'), walletOn],
                    ['sepay', t('wallet.methodBankInstant'), pay?.sepayEnabled],
                    ['payos', 'PayOS', pay?.payosEnabled],
                    ['bank', t('wallet.methodBankManual'), pay?.bankEnabled],
                  ] as const).filter(([, , enabled]) => enabled).map(([value, label, enabled]) => (
                    <button
                      key={value}
                      type="button"
                      disabled={!enabled}
                      onClick={() => setMethod(value)}
                      className={`rounded-lg border py-2 text-sm font-semibold transition disabled:opacity-40 ${
                        method === value ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <button className="btn-primary w-full" onClick={buy} disabled={buyBusy}>
                <Icon name="gift" size={16} /> {buyBusy ? t('checkout.processing') : t('gift.buy')}
              </button>
            </div>
          </div>

          {/* Redeem */}
          <div className="card p-5">
            <h2 className="font-bold">{t('gift.redeemTitle')}</h2>
            <p className="mt-0.5 text-xs text-gray-500">{t('gift.redeemIntro')}</p>
            <div className="mt-3 flex gap-2">
              <input
                className="input flex-1 font-mono uppercase"
                placeholder="GIFT-XXXX-XXXX-XXXX"
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
              />
              <button className="btn-primary shrink-0" onClick={redeem} disabled={redeemBusy || !redeemCode.trim()}>
                {redeemBusy ? '…' : t('gift.redeem')}
              </button>
            </div>
          </div>
        </div>

        {/* Purchased cards */}
        <div className="card">
          <h2 className="border-b border-gray-100 p-4 font-bold">{t('gift.yourCards')}</h2>
          <div className="divide-y divide-gray-100">
            {cards.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-pink-50 text-pink-500">
                  <Icon name="gift" size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-sm font-semibold">{c.code || t('gift.processingCode')}</span>
                  <span className="block text-xs text-gray-400">
                    {formatDate(c.createdAt, intlLocale, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </span>
                <span className="text-sm font-bold">{money(c.amount)}</span>
                {c.status === 'ACTIVE' && (
                  <>
                    <span className="badge bg-green-100 text-green-700">{t('gift.statusActive')}</span>
                    {c.code && (
                      <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => copy(c.code!)}>{t('common.copy')}</button>
                    )}
                  </>
                )}
                {c.status === 'REDEEMED' && <span className="badge bg-gray-100 text-gray-500">{t('gift.statusRedeemed')}</span>}
                {c.status === 'PENDING' && <span className="badge bg-amber-100 text-amber-700">{t('gift.statusPending')}</span>}
              </div>
            ))}
            {cards.length === 0 && (
              <p className="px-4 py-12 text-center text-sm text-gray-400">
                {t('gift.none')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
