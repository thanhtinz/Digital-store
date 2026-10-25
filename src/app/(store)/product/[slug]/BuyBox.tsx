'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore, useMoney, useT } from '@/components/Providers';
import { api } from '@/lib/client';
import { type CustomFieldDef } from '@/lib/utils';
import Countdown from '@/components/Countdown';
import Icon from '@/components/icons';

type PackageView = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  originalPrice: number;
  comparePrice: number | null;
  onSale: boolean;
  saleEndsAt: string | null;
  customFields: CustomFieldDef[];
  stock: number | null; // null = manual fulfillment (always orderable)
};

// Shown when an auto-delivered package has no stock: explains the backorder
// and lets the shopper subscribe to a restock email.
function OutOfStockNotice({ packageId }: { packageId: number }) {
  const { user, toast } = useStore();
  const t = useT();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const subscribe = async () => {
    setBusy(true);
    try {
      await api('/api/stock-alerts', { method: 'POST', json: { packageId, email } });
      setDone(true);
      toast(t('catalog.notifySaved'));
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-5 rounded-[2px] bg-amber-50 p-3">
      <p className="text-xs font-semibold text-amber-800">{t('catalog.outOfStockLong')}</p>
      <p className="mt-0.5 text-xs text-amber-700">{t('catalog.notifyIntro')}</p>
      {done ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-green-700">
          <Icon name="check" size={13} /> {t('catalog.notifyDone')}
        </p>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {!user && (
            <input
              className="input h-9 max-w-[220px] flex-1 text-xs"
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
          <button
            className="flex items-center gap-1.5 rounded-[2px] border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
            onClick={subscribe}
            disabled={busy || (!user && !email.trim())}
          >
            <Icon name="bell" size={13} /> {busy ? t('catalog.saving') : t('catalog.notifyButton')}
          </button>
        </div>
      )}
    </div>
  );
}

// Shopee's selected-variation corner tick: an orange triangle with a white
// check in the bottom-right corner of the chosen tile.
function CornerTick() {
  return (
    <svg viewBox="0 0 14 14" className="absolute bottom-0 right-0 h-3.5 w-3.5" aria-hidden="true">
      <path d="M0 14h14V0z" fill="rgb(var(--brand-600))" />
      <path d="M5.6 10.1l.9-.9 1.3 1.3 3.9-3.9.9.9-4.8 4.8z" fill="#fff" />
    </svg>
  );
}

const LABEL = 'w-[110px] shrink-0 pt-2 text-black/50';

export default function BuyBox({ productId, packages }: { productId: number; packages: PackageView[] }) {
  const money = useMoney();
  const { user, refreshCart, toast } = useStore();
  const t = useT();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(packages[0]?.id ?? 0);
  const [quantity, setQuantity] = useState(1);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<'' | 'cart' | 'buy'>('');

  const pkg = packages.find((p) => p.id === selectedId) || packages[0];
  if (!pkg) {
    return <div className="rounded-[2px] bg-[#fafafa] p-6 text-sm text-gray-500">{t('catalog.unavailable')}</div>;
  }

  const strike = pkg.onSale ? pkg.originalPrice : pkg.comparePrice;
  const discountPct = strike && strike > pkg.price ? Math.round((1 - pkg.price / strike) * 100) : 0;
  const soldOut = pkg.stock !== null && pkg.stock === 0;
  const maxQty = pkg.stock === null ? 100 : Math.max(1, Math.min(100, pkg.stock));

  const validateFields = (): Record<string, string> | null => {
    const data: Record<string, string> = {};
    for (const def of pkg.customFields) {
      const value = (fields[def.key] || '').trim();
      if (def.required && !value) {
        toast(t('catalog.fillField', { label: def.label }), 'error');
        return null;
      }
      if (value) data[def.key] = value;
    }
    return data;
  };

  const requireLogin = (): boolean => {
    if (!user) {
      toast(t('catalog.signInFirst'), 'error');
      router.push('/login');
      return true;
    }
    return false;
  };

  const addToCart = async () => {
    if (requireLogin()) return;
    const data = validateFields();
    if (data === null) return;
    setBusy('cart');
    try {
      await api('/api/cart', { method: 'POST', json: { packageId: pkg.id, quantity, customFieldsData: data } });
      await refreshCart();
      toast(t('catalog.addedToCart'));
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy('');
    }
  };

  const buyNow = async () => {
    if (requireLogin()) return;
    const data = validateFields();
    if (data === null) return;
    // Hand off to checkout with the buy-now payload in sessionStorage.
    sessionStorage.setItem('ds_buy_now', JSON.stringify({ packageId: pkg.id, quantity, customFieldsData: data }));
    router.push('/checkout?buyNow=1');
  };

  return (
    <div>
      {/* Flash-sale strip + price block, Shopee-style */}
      <div className="mt-4">
        {pkg.onSale && pkg.saleEndsAt && (
          <div className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 px-4 py-2.5 text-white">
            <span className="flex items-center gap-1.5 text-base font-bold uppercase tracking-wide">
              <Icon name="bolt" size={18} /> Flash Sale
            </span>
            <span className="flex items-center gap-2 text-xs">
              {t('catalog.saleEndsIn')} <Countdown until={pkg.saleEndsAt} />
            </span>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-[#fafafa] px-5 py-4">
          <span className="text-[30px] font-medium leading-none text-brand-600">{money(pkg.price * quantity)}</span>
          {strike && strike > pkg.price && (
            <span className="text-base text-black/40 line-through">{money(strike * quantity)}</span>
          )}
          {discountPct > 0 && (
            <span className="rounded-[2px] bg-brand-600 px-1 py-0.5 text-xs font-medium text-white">-{discountPct}%</span>
          )}
        </div>
      </div>

      {/* Delivery row (digital: automatic, no shipping) */}
      <div className="mt-5 flex text-sm">
        <span className={LABEL}>{t('product.specDelivery')}</span>
        <span className="flex min-w-0 items-center gap-1.5 pt-2 text-black/80">
          <Icon name="bolt" size={15} className="shrink-0 text-brand-600" /> {t('product.specDeliveryAuto')}
        </span>
      </div>

      {/* Package selector: Shopee variation tiles */}
      <div className="mt-4 flex text-sm">
        <span className={LABEL}>{t('catalog.choosePackage')}</span>
        <div className="flex flex-1 flex-wrap gap-2 pt-1">
          {packages.map((p) => {
            const selected = p.id === pkg.id;
            return (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedId(p.id);
                  setQuantity((q) => Math.min(q, p.stock === null ? 100 : Math.max(1, p.stock)));
                }}
                className={`relative min-w-[130px] max-w-[240px] flex-1 rounded-[2px] border px-3 py-2 text-left transition sm:flex-none ${
                  selected
                    ? 'border-brand-600 bg-white'
                    : 'border-black/10 bg-white hover:border-brand-600'
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className={`text-sm ${selected ? 'text-brand-600' : 'text-black/80'}`}>{p.name}</span>
                  <span className="flex gap-1">
                    {p.onSale && <span className="badge gap-1 bg-red-100 text-red-700"><Icon name="bolt" size={11} /> {t('catalog.sale')}</span>}
                    {p.stock === null ? null : p.stock > 0 ? (
                      <span className="badge gap-1 bg-green-100 text-green-700"><Icon name="bolt" size={11} /> {t('catalog.instant')}</span>
                    ) : (
                      <span className="badge bg-red-100 text-red-700">{t('product.outOfStock')}</span>
                    )}
                  </span>
                </span>
                <span className={`mt-0.5 block text-sm font-medium ${selected ? 'text-brand-600' : 'text-black/80'}`}>{money(p.price)}</span>
                {p.description && <span className="mt-0.5 line-clamp-2 block text-xs text-black/45">{p.description}</span>}
                {selected && <CornerTick />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom fields required for this package */}
      {!soldOut && pkg.customFields.length > 0 && (
        <div className="mt-5 space-y-3 rounded-[2px] bg-[#fafafa] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('catalog.requiredInfo')}</p>
          {pkg.customFields.map((def) => (
            <div key={def.key}>
              <label className="label">
                {def.label} {def.required && <span className="text-red-500">*</span>}
              </label>
              {def.type === 'textarea' ? (
                <textarea
                  className="input"
                  rows={2}
                  placeholder={def.placeholder}
                  value={fields[def.key] || ''}
                  onChange={(e) => setFields((f) => ({ ...f, [def.key]: e.target.value }))}
                />
              ) : (
                <input
                  className="input"
                  type={def.type === 'number' ? 'number' : def.type === 'email' ? 'email' : 'text'}
                  placeholder={def.placeholder}
                  value={fields[def.key] || ''}
                  onChange={(e) => setFields((f) => ({ ...f, [def.key]: e.target.value }))}
                />
              )}
              {def.help && <p className="mt-1 text-xs text-gray-500">{def.help}</p>}
            </div>
          ))}
        </div>
      )}

      {soldOut ? (
        <OutOfStockNotice packageId={pkg.id} />
      ) : (
        <>
          {/* Quantity row */}
          <div className="mt-5 flex flex-wrap items-center text-sm">
            <span className="w-[110px] shrink-0 text-black/50">{t('product.quantity')}</span>
            <div className="flex items-center border border-black/10">
              <button className="h-8 w-8 text-base leading-none text-black/60 transition hover:bg-gray-50" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="-">−</button>
              <span className="w-12 border-x border-black/10 text-center text-sm leading-8">{quantity}</span>
              <button className="h-8 w-8 text-base leading-none text-black/60 transition hover:bg-gray-50" onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))} aria-label="+">+</button>
            </div>
            <span className="ml-3 text-black/40">
              {pkg.stock !== null ? t('buybox.available', { count: pkg.stock }) : t('product.inStock')}
            </span>
          </div>
          {pkg.stock !== null && pkg.stock > 0 && pkg.stock <= 10 && (
            <p className="mt-2 pl-[110px] text-xs font-semibold text-amber-600">{t('catalog.onlyLeft', { count: pkg.stock })}</p>
          )}

          {/* Actions: Shopee's tinted add-to-cart + solid buy-now */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              className="flex h-12 min-w-[180px] flex-1 items-center justify-center gap-2 rounded-[2px] border border-brand-600 bg-brand-50 px-4 text-[15px] text-brand-600 transition hover:bg-brand-100 disabled:opacity-60"
              onClick={addToCart}
              disabled={busy !== ''}
            >
              <Icon name="cart" size={19} />
              {busy === 'cart' ? t('catalog.adding') : t('product.addToCart')}
            </button>
            <button
              className="h-12 min-w-[180px] flex-1 rounded-[2px] bg-brand-600 px-4 text-[15px] text-white transition hover:bg-brand-700 disabled:opacity-60"
              onClick={buyNow}
              disabled={busy !== ''}
            >
              {t('product.buyNow')}
            </button>
          </div>
          <p className="mt-3 text-xs text-black/40">{t('catalog.secureCheckout')}</p>
        </>
      )}
    </div>
  );
}
