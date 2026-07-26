'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/components/Providers';
import { api } from '@/lib/client';
import { formatMoney, type CustomFieldDef } from '@/lib/utils';
import Countdown from '@/components/Countdown';

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
};

export default function BuyBox({ productId, packages }: { productId: number; packages: PackageView[] }) {
  const { user, refreshCart, toast } = useStore();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(packages[0]?.id ?? 0);
  const [quantity, setQuantity] = useState(1);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<'' | 'cart' | 'buy'>('');

  const pkg = packages.find((p) => p.id === selectedId) || packages[0];
  if (!pkg) {
    return <div className="card p-6 text-sm text-gray-500">This product is currently unavailable.</div>;
  }

  const strike = pkg.onSale ? pkg.originalPrice : pkg.comparePrice;

  const validateFields = (): Record<string, string> | null => {
    const data: Record<string, string> = {};
    for (const def of pkg.customFields) {
      const value = (fields[def.key] || '').trim();
      if (def.required && !value) {
        toast(`Please fill in “${def.label}”`, 'error');
        return null;
      }
      if (value) data[def.key] = value;
    }
    return data;
  };

  const requireLogin = (): boolean => {
    if (!user) {
      toast('Please sign in to continue', 'error');
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
      toast('Added to cart');
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
      <p className="label">Choose a package</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {packages.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedId(p.id)}
            className={`rounded-xl border-2 p-3 text-left transition ${
              p.id === pkg.id ? 'border-brand-600 bg-brand-50' : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">{p.name}</span>
              {p.onSale && <span className="badge bg-red-100 text-red-700">⚡ Sale</span>}
            </div>
            <p className="mt-1 text-sm font-bold text-brand-700">{formatMoney(p.price)}</p>
            {p.description && <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{p.description}</p>}
          </button>
        ))}
      </div>

      {/* Price */}
      <div className="mt-4 flex flex-wrap items-baseline gap-2">
        <span className="text-3xl font-extrabold text-gray-900">{formatMoney(pkg.price * quantity)}</span>
        {strike && strike > pkg.price && (
          <span className="text-base text-gray-400 line-through">{formatMoney(strike * quantity)}</span>
        )}
        {pkg.onSale && pkg.saleEndsAt && (
          <span className="ml-auto flex items-center gap-2 text-xs text-red-600">
            Sale ends in <Countdown until={pkg.saleEndsAt} />
          </span>
        )}
      </div>

      {/* Custom fields required for this package */}
      {pkg.customFields.length > 0 && (
        <div className="mt-4 space-y-3 rounded-xl bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Required information</p>
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

      {/* Quantity + actions */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-lg border border-gray-300">
          <button className="px-3 py-2 text-lg leading-none hover:bg-gray-100" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
          <span className="w-10 text-center text-sm font-semibold">{quantity}</span>
          <button className="px-3 py-2 text-lg leading-none hover:bg-gray-100" onClick={() => setQuantity((q) => Math.min(100, q + 1))}>+</button>
        </div>
        <button className="btn-secondary flex-1" onClick={addToCart} disabled={busy !== ''}>
          {busy === 'cart' ? 'Adding…' : '🛒 Add to cart'}
        </button>
        <button className="btn-primary flex-1" onClick={buyNow} disabled={busy !== ''}>
          Buy now
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-gray-400">
        Secure checkout · Visa / Mastercard via Stripe · PayPal
      </p>
    </div>
  );
}
