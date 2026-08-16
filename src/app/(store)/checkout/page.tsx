'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useStore, useMoney, useT } from '@/components/Providers';
import { api } from '@/lib/client';
import { type CustomFieldDef, formatNumber } from '@/lib/utils';
import Icon from '@/components/icons';
import { INTL_LOCALE } from '@/i18n';

type CartItemView = {
  id: number;
  packageId: number;
  quantity: number;
  customFieldsData: Record<string, string>;
  productName: string;
  packageName: string;
  image: string | null;
  unitPrice: number;
  available: boolean;
  customFieldDefs: CustomFieldDef[];
};

type PublicPay = { stripeEnabled: boolean; paypalEnabled: boolean; sepayEnabled?: boolean; payosEnabled?: boolean; bankEnabled?: boolean };
type Method = 'stripe' | 'paypal' | 'balance' | 'sepay' | 'payos' | 'bank';

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="container py-16 text-center text-gray-400" />}>
      <CheckoutInner />
    </Suspense>
  );
}

type LoyaltyInfo = { enabled: boolean; points: number; redeemValue: number; minRedeem: number };

function CheckoutInner() {
  const { user, toast, locale } = useStore();
  const t = useT();
  const intlLocale = INTL_LOCALE[locale];
  const money = useMoney();
  const router = useRouter();
  const params = useSearchParams();
  const isBuyNow = params.get('buyNow') === '1';

  const [items, setItems] = useState<CartItemView[] | null>(null);
  const [buyNow, setBuyNow] = useState<{ packageId: number; quantity: number; customFieldsData: Record<string, string> } | null>(null);
  const [pay, setPay] = useState<PublicPay>({ stripeEnabled: false, paypalEnabled: false });
  const [walletOn, setWalletOn] = useState(true);
  const [method, setMethod] = useState<Method>('stripe');
  const [vnd, setVnd] = useState<{ rate: number; code: string } | null>(null);
  const [loyalty, setLoyalty] = useState<LoyaltyInfo | null>(null);
  const [usePoints, setUsePoints] = useState(false);
  const [coupon, setCoupon] = useState('');
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    api<LoyaltyInfo>('/api/loyalty/me').then(setLoyalty).catch(() => {});
    api<{ payments: PublicPay; features?: Record<string, boolean>; rates?: Record<string, number>; paymentCurrency?: string; money?: { code: string } }>('/api/public/config')
      .then((d) => {
        setPay(d.payments);
        const code = (d.paymentCurrency || 'VND').toUpperCase();
        const rate = code === d.money?.code ? 1 : d.rates?.[code];
        if (rate) setVnd({ rate, code });
        const wallet = d.features?.wallet !== false;
        setWalletOn(wallet);
        // Preselect a method that is actually offered.
        if (d.payments.stripeEnabled) setMethod('stripe');
        else if (d.payments.paypalEnabled) setMethod('paypal');
        else if (d.payments.sepayEnabled) setMethod('sepay');
        else if (d.payments.payosEnabled) setMethod('payos');
        else if (d.payments.bankEnabled) setMethod('bank');
        else if (wallet) setMethod('balance');
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user === undefined) return;
    if (user === null) {
      router.replace('/login?next=/checkout');
      return;
    }
    if (isBuyNow) {
      try {
        const stored = JSON.parse(sessionStorage.getItem('ds_buy_now') || 'null');
        if (stored?.packageId) {
          setBuyNow(stored);
          // Show a synthetic single line; price shown after fetching cart-like data
          api<{ items: CartItemView[] }>('/api/cart').catch(() => null);
        }
      } catch {
        /* fall back to cart */
      }
    }
    api<{ items: CartItemView[] }>('/api/cart')
      .then((d) => setItems(d.items.filter((i) => i.available)))
      .catch(() => setItems([]));
  }, [user, isBuyNow, router]);

  if (user === undefined || items === null) {
    return <div className="container py-16 text-center text-gray-400">{t('checkout.loading')}</div>;
  }

  // Buy-now mode shows the item from sessionStorage matched against cart-style pricing is not possible;
  // simply checkout the stored payload — totals are computed server-side anyway.
  const effectiveItems = items;
  const subtotal = effectiveItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const discount = applied?.discount || 0;
  const canRedeem = !!loyalty?.enabled && (loyalty?.points || 0) >= (loyalty?.minRedeem || 0) && (loyalty?.redeemValue || 0) > 0;
  const pointsDiscount = usePoints && canRedeem && loyalty
    ? Math.min(Math.round(loyalty.points * loyalty.redeemValue * 100) / 100, Math.max(0, subtotal - discount - 0.5))
    : 0;
  const total = Math.max(0, Math.round((subtotal - discount - pointsDiscount) * 100) / 100);
  const balance = user?.balance ?? 0;
  const nothingToBuy = !buyNow && effectiveItems.length === 0;

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    setApplying(true);
    try {
      const d = await api<{ code: string; discount: number }>('/api/coupons/validate', {
        method: 'POST',
        json: { code: coupon, subtotal },
      });
      setApplied({ code: d.code, discount: d.discount });
      toast(t('checkout.couponApplied', { code: d.code, amount: money(d.discount) }));
    } catch (e: any) {
      setApplied(null);
      toast(e.message, 'error');
    } finally {
      setApplying(false);
    }
  };

  const placeOrder = async () => {
    if (!pay.stripeEnabled && !pay.paypalEnabled && !walletOn && !pay.sepayEnabled && !pay.payosEnabled && !pay.bankEnabled) {
      toast(t('checkout.noMethod'), 'error');
      return;
    }
    if (method === 'stripe' && !pay.stripeEnabled) {
      toast(t('checkout.cardUnavailable'), 'error');
      return;
    }
    if (method === 'paypal' && !pay.paypalEnabled) {
      toast(t('checkout.paypalUnavailable'), 'error');
      return;
    }
    if (method === 'balance' && !walletOn) {
      toast(t('checkout.walletUnavailable'), 'error');
      return;
    }
    if (method === 'balance' && !buyNow && balance < total) {
      toast(t('checkout.insufficient'), 'error');
      return;
    }
    setBusy(true);
    try {
      const d = await api<{ redirectUrl: string; orderCode: string; paid?: boolean }>('/api/checkout', {
        method: 'POST',
        json: {
          paymentMethod: method,
          couponCode: applied?.code,
          redeemPoints: usePoints && canRedeem && loyalty ? loyalty.points : undefined,
          ...(buyNow ? { buyNow } : {}),
        },
      });
      sessionStorage.removeItem('ds_buy_now');
      window.location.href = d.redirectUrl;
    } catch (e: any) {
      toast(e.message, 'error');
      setBusy(false);
    }
  };

  return (
    <div className="container py-8">
      <p className="section-eyebrow">{t('checkout.eyebrow')}</p>
      <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{t('checkout.title')}</h1>

      {nothingToBuy ? (
        <div className="card mt-6 p-16 text-center">
          <p className="font-semibold">{t('checkout.nothing')}</p>
          <Link href="/products" className="btn-primary mt-5 inline-flex">{t('cart.browse')}</Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Payment method */}
          <div className="space-y-6">
            <div className="card p-5">
              <h2 className="font-bold">{t('checkout.paymentMethod')}</h2>
              <div className="mt-4 space-y-2.5">
                {walletOn && (
                  <button
                    onClick={() => setMethod('balance')}
                    className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition ${
                      method === 'balance' ? 'border-brand-600 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-green-50 text-green-700"><Icon name="credit-card" size={22} /></span>
                    <span className="flex-1">
                      <span className="block text-sm font-semibold">{t('checkout.wallet')}</span>
                      <span className="block text-xs text-gray-500">
                        {t('checkout.walletSub', { balance: money(balance) })}
                      </span>
                    </span>
                    {balance < total && !buyNow && (
                      <a href="/wallet" onClick={(e) => e.stopPropagation()} className="text-xs font-semibold text-brand-600 hover:underline">{t('checkout.topUp')}</a>
                    )}
                  </button>
                )}
                <button
                  onClick={() => setMethod('stripe')}
                  disabled={!pay.stripeEnabled}
                  className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition disabled:opacity-40 ${
                    method === 'stripe' && pay.stripeEnabled ? 'border-brand-600 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700"><Icon name="credit-card" size={22} /></span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">{t('checkout.card')}</span>
                    <span className="block text-xs text-gray-500">{t('checkout.cardSub')}</span>
                  </span>
                  {!pay.stripeEnabled && <span className="text-xs text-gray-400">{t('checkout.unavailable')}</span>}
                </button>
                <button
                  onClick={() => setMethod('paypal')}
                  disabled={!pay.paypalEnabled}
                  className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition disabled:opacity-40 ${
                    method === 'paypal' && pay.paypalEnabled ? 'border-brand-600 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700"><Icon name="paypal" size={22} /></span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">PayPal</span>
                    <span className="block text-xs text-gray-500">{t('checkout.paypalSub')}</span>
                  </span>
                  {!pay.paypalEnabled && <span className="text-xs text-gray-400">{t('checkout.unavailable')}</span>}
                </button>

                {/* Vietnamese bank transfer methods */}
                {([
                  ['sepay', pay.sepayEnabled, t('checkout.sepay'), t('checkout.sepaySub'), 'bolt', 'bg-emerald-50 text-emerald-700'],
                  ['payos', pay.payosEnabled, 'PayOS', t('checkout.payosSub'), 'credit-card', 'bg-sky-50 text-sky-700'],
                  ['bank', pay.bankEnabled, t('checkout.bank'), t('checkout.bankSub'), 'store', 'bg-amber-50 text-amber-700'],
                ] as const).filter(([, enabled]) => enabled).map(([value, , title, desc, icon, tint]) => (
                  <button
                    key={value}
                    onClick={() => setMethod(value as Method)}
                    className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition ${
                      method === value ? 'border-brand-600 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${tint}`}><Icon name={icon} size={22} /></span>
                    <span className="flex-1">
                      <span className="block text-sm font-semibold">{title}</span>
                      <span className="block text-xs text-gray-500">{desc}</span>
                    </span>
                    {vnd && (
                      <span className="whitespace-nowrap text-xs font-semibold text-gray-600">
                        ~ {formatNumber((Math.ceil((total * vnd.rate) / 1000) * 1000), intlLocale)} {vnd.code}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {canRedeem && loyalty && (
                <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl bg-amber-50 p-4">
                  <input type="checkbox" checked={usePoints} onChange={(e) => setUsePoints(e.target.checked)} />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-amber-800">
                      {t('checkout.usePoints', { points: formatNumber(loyalty.points, intlLocale) })}
                    </span>
                    <span className="block text-xs text-amber-700">
                      {t('checkout.pointsSave', {
                        amount: money(Math.min(loyalty.points * loyalty.redeemValue, Math.max(0, subtotal - discount - 0.5))),
                      })}
                    </span>
                  </span>
                  <Icon name="star" size={18} className="text-amber-500" />
                </label>
              )}
              <p className="mt-4 text-xs text-gray-400">{t('checkout.redirectNote')}</p>
            </div>

            {/* Coupon */}
            <div className="card p-5">
              <h2 className="font-bold">{t('checkout.couponCode')}</h2>
              <div className="mt-3 flex gap-2">
                <input
                  className="input flex-1 uppercase"
                  placeholder={t('checkout.couponPlaceholder')}
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                />
                <button className="btn-secondary" onClick={applyCoupon} disabled={applying}>
                  {applying ? t('checkout.checking') : t('checkout.apply')}
                </button>
              </div>
              {applied && (
                <p className="mt-2 flex items-center gap-1 text-sm font-medium text-green-600">
                  <Icon name="check" size={15} /> {t('checkout.couponInline', { code: applied.code, amount: money(applied.discount) })}
                  <button className="ml-2 text-xs text-gray-400 underline" onClick={() => setApplied(null)}>{t('checkout.removeCoupon')}</button>
                </p>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="card h-fit p-5">
            <h2 className="font-bold">{t('checkout.orderSummary')}</h2>
            {buyNow ? (
              <p className="mt-3 rounded-lg bg-brand-50 p-3 text-sm text-brand-800">
                {t('checkout.buyNowNote')}
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {effectiveItems.map((i) => (
                  <div key={i.id} className="flex items-center gap-3">
                    <span className="h-10 w-12 shrink-0 overflow-hidden rounded-md bg-gray-100">
                      {i.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={i.image} alt="" className="h-full w-full object-cover" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1 text-xs font-medium">{i.productName}</span>
                      <span className="text-[11px] text-gray-500">{i.packageName} × {i.quantity}</span>
                    </span>
                    <span className="text-sm font-semibold">{money(i.unitPrice * i.quantity)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 space-y-1.5 border-t border-gray-100 pt-4 text-sm">
              {!buyNow && (
                <>
                  <div className="flex justify-between"><span className="text-gray-500">{t('cart.subtotal')}</span><span>{money(subtotal)}</span></div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600"><span>{t('checkout.discount')}</span><span>−{money(discount)}</span></div>
                  )}
                  {pointsDiscount > 0 && (
                    <div className="flex justify-between text-amber-600"><span>{t('checkout.loyaltyPoints')}</span><span>−{money(pointsDiscount)}</span></div>
                  )}
                  <div className="flex justify-between pt-1 text-base font-bold"><span>{t('checkout.total')}</span><span>{money(total)}</span></div>
                </>
              )}
            </div>
            <button className="btn-primary mt-5 w-full" onClick={placeOrder} disabled={busy}>
              {busy
                ? t('checkout.processing')
                : method === 'balance'
                ? buyNow
                  ? t('checkout.payWalletBalance')
                  : t('checkout.payWallet', { amount: money(total) })
                : method === 'paypal'
                ? t('checkout.payPaypal')
                : method === 'stripe'
                ? t('checkout.payCard')
                : t('checkout.continue')}
            </button>
            <p className="mt-3 flex items-center justify-center gap-1 text-center text-xs text-gray-400"><Icon name="lock" size={13} /> {t('checkout.securePayment')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
