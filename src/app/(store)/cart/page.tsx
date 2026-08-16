'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useStore, useMoney, useT } from '@/components/Providers';
import { api } from '@/lib/client';
import { type CustomFieldDef } from '@/lib/utils';
import Icon from '@/components/icons';

type CartItemView = {
  id: number;
  packageId: number;
  quantity: number;
  customFieldsData: Record<string, string>;
  productName: string;
  productSlug: string;
  packageName: string;
  image: string | null;
  unitPrice: number;
  originalPrice: number;
  onSale: boolean;
  available: boolean;
  outOfStock?: boolean;
  customFieldDefs: CustomFieldDef[];
};

export default function CartPage() {
  const { user, refreshCart, toast } = useStore();
  const money = useMoney();
  const t = useT();
  const [items, setItems] = useState<CartItemView[] | null>(null);

  const load = async () => {
    try {
      const data = await api<{ items: CartItemView[] }>('/api/cart');
      setItems(data.items);
    } catch {
      setItems([]);
    }
  };

  useEffect(() => {
    if (user !== undefined) load();
  }, [user]);

  const update = async (id: number, quantity: number) => {
    try {
      const data = await api<{ items: CartItemView[] }>('/api/cart', { method: 'PATCH', json: { id, quantity } });
      setItems(data.items);
      await refreshCart();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  if (user === null) {
    return (
      <div className="container py-16 text-center">
        <Icon name="cart" size={56} className="mx-auto text-gray-300" />
        <h1 className="mt-4 text-xl font-bold">{t('cart.signInTitle')}</h1>
        <Link href="/login" className="btn-primary mt-5 inline-flex">{t('nav.signIn')}</Link>
      </div>
    );
  }
  if (items === null) {
    return <div className="container py-16 text-center text-gray-400">{t('cart.loading')}</div>;
  }

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  return (
    <div className="container py-8">
      <p className="section-eyebrow">{t('checkout.title')}</p>
      <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{t('cart.pageTitle')}</h1>
      {items.length === 0 ? (
        <div className="card mt-6 p-16 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gray-100 text-gray-300">
            <Icon name="cart" size={30} />
          </span>
          <p className="mt-4 text-lg font-bold">{t('cart.empty')}</p>
          <p className="mt-1 text-sm text-gray-500">{t('cart.emptyText')}</p>
          <Link href="/products" className="btn-primary mt-5 inline-flex">{t('cart.browse')}</Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className={`card flex gap-4 p-4 ${!item.available ? 'opacity-60' : ''}`}>
                <Link href={`/product/${item.productSlug}`} className="h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt={item.productName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-gray-300"><Icon name="bag" size={26} /></div>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/product/${item.productSlug}`} className="line-clamp-1 text-sm font-semibold hover:text-brand-600">
                    {item.productName}
                  </Link>
                  <p className="text-xs text-gray-500">{item.packageName}</p>
                  {!item.available && (
                    <p className="mt-0.5 text-xs font-semibold text-red-600">
                      {item.outOfStock ? t('cart.itemOutOfStock') : t('cart.itemUnavailable')}
                    </p>
                  )}
                  {Object.keys(item.customFieldsData).length > 0 && (
                    <p className="mt-1 truncate text-xs text-gray-400">
                      {Object.entries(item.customFieldsData).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center rounded-lg border border-gray-300">
                      <button className="px-2.5 py-1 hover:bg-gray-100" onClick={() => update(item.id, item.quantity - 1)}>−</button>
                      <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                      <button className="px-2.5 py-1 hover:bg-gray-100" onClick={() => update(item.id, item.quantity + 1)}>+</button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold">{money(item.unitPrice * item.quantity)}</span>
                      {item.onSale && (
                        <span className="text-xs text-gray-400 line-through">{money(item.originalPrice * item.quantity)}</span>
                      )}
                      <button className="text-xs font-medium text-red-500 hover:underline" onClick={() => update(item.id, 0)}>
                        {t('cart.remove')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="card h-fit p-5">
            <h2 className="font-bold">{t('checkout.orderSummary')}</h2>
            <div className="mt-4 flex justify-between text-sm">
              <span className="text-gray-500">{t('cart.subtotal')}</span>
              <span className="font-semibold">{money(subtotal)}</span>
            </div>
            <p className="mt-1 text-xs text-gray-400">{t('cart.couponsAtCheckout')}</p>
            <Link
              href="/checkout"
              className={`btn-primary mt-5 w-full ${items.some((i) => !i.available) ? 'pointer-events-none opacity-50' : ''}`}
            >
              {t('cart.proceed')}
            </Link>
            <p className="mt-3 text-center text-xs text-gray-400">Visa · Mastercard · PayPal</p>
          </div>
        </div>
      )}
    </div>
  );
}
