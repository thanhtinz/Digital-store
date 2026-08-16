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
    <div className="mt-3 rounded-lg bg-amber-50 p-3">
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
            className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
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
    return <div className="card p-6 text-sm text-gray-500">{t('catalog.unavailable')}</div>;
  }

  const strike = pkg.onSale ? pkg.originalPrice : pkg.comparePrice;
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
    <div className="card p-5">
      {/* Package selector */}
      <p className="label">{t('catalog.choosePackage')}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {packages.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setSelectedId(p.id);
              setQuantity((q) => Math.min(q, p.stock === null ? 100 : Math.max(1, p.stock)));
            }}
            className={`rounded-xl border-2 p-3 text-left transition ${
              p.id === pkg.id ? 'border-brand-600 bg-brand-50' : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">{p.name}</span>
              <span className="flex gap-1">
                {p.onSale && <span className="badge gap-1 bg-red-100 text-red-700"><Icon name="bolt" size={11} /> {t('catalog.sale')}</span>}
                {p.stock === null ? null : p.stock > 0 ? (
                  <span className="badge gap-1 bg-green-100 text-green-700"><Icon name="bolt" size={11} /> {t('catalog.instant')}</span>
                ) : (
                  <span className="badge bg-red-100 text-red-700">{t('product.outOfStock')}</span>
                )}
              </span>
            </div>
            <p className="mt-1 text-sm font-bold text-brand-700">{money(p.price)}</p>
            {p.description && <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{p.description}</p>}
          </button>
        ))}
      </div>

      {/* Price */}
      <div className="mt-4 flex flex-wrap items-baseline gap-2">
        <span className="text-3xl font-extrabold text-gray-900">{money(pkg.price * quantity)}</span>
        {strike && strike > pkg.price && (
          <span className="text-base text-gray-400 line-through">{money(strike * quantity)}</span>
        )}
        {pkg.onSale && pkg.saleEndsAt && (
          <span className="ml-auto flex items-center gap-2 text-xs text-red-600">
            {t('catalog.saleEndsIn')} <Countdown until={pkg.saleEndsAt} />
          </span>
        )}
      </div>

      {/* Custom fields required for this package */}
      {!soldOut && pkg.customFields.length > 0 && (
        <div className="mt-4 space-y-3 rounded-xl bg-gray-50 p-4">
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
          {/* Quantity + actions */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-lg border border-gray-300">
              <button className="px-3 py-2 text-lg leading-none hover:bg-gray-100" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
              <span className="w-10 text-center text-sm font-semibold">{quantity}</span>
              <button className="px-3 py-2 text-lg leading-none hover:bg-gray-100" onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}>+</button>
            </div>
            <button className="btn-secondary flex-1" onClick={addToCart} disabled={busy !== ''}>
              {busy === 'cart' ? t('catalog.adding') : (<><Icon name="cart" size={17} /> {t('product.addToCart')}</>)}
            </button>
            <button className="btn-primary flex-1" onClick={buyNow} disabled={busy !== ''}>
              {t('product.buyNow')}
            </button>
          </div>
          {pkg.stock !== null && pkg.stock > 0 && pkg.stock <= 10 && (
            <p className="mt-2 text-xs font-semibold text-amber-600">{t('catalog.onlyLeft', { count: pkg.stock })}</p>
          )}
          <p className="mt-3 text-center text-xs text-gray-400">{t('catalog.secureCheckout')}</p>
        </>
      )}
    </div>
  );
}
