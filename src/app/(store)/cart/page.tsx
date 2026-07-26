'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/components/Providers';
import { api } from '@/lib/client';
import { formatMoney, type CustomFieldDef } from '@/lib/utils';
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
  customFieldDefs: CustomFieldDef[];
};

export default function CartPage() {
  const { user, refreshCart, toast } = useStore();
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
        <h1 className="mt-4 text-xl font-bold">Sign in to view your cart</h1>
        <Link href="/login" className="btn-primary mt-5 inline-flex">Sign in</Link>
      </div>
    );
  }
  if (items === null) {
    return <div className="container py-16 text-center text-gray-400">Loading cart…</div>;
  }

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold">Shopping cart</h1>
      {items.length === 0 ? (
        <div className="card mt-6 p-16 text-center">
          <Icon name="cart" size={56} className="mx-auto text-gray-300" />
          <p className="mt-4 font-semibold">Your cart is empty</p>
          <Link href="/products" className="btn-primary mt-5 inline-flex">Browse products</Link>
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
                  {!item.available && <p className="mt-0.5 text-xs font-semibold text-red-600">No longer available — please remove</p>}
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
                      <span className="text-sm font-bold">{formatMoney(item.unitPrice * item.quantity)}</span>
                      {item.onSale && (
                        <span className="text-xs text-gray-400 line-through">{formatMoney(item.originalPrice * item.quantity)}</span>
                      )}
                      <button className="text-xs font-medium text-red-500 hover:underline" onClick={() => update(item.id, 0)}>
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="card h-fit p-5">
            <h2 className="font-bold">Order summary</h2>
            <div className="mt-4 flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-semibold">{formatMoney(subtotal)}</span>
            </div>
            <p className="mt-1 text-xs text-gray-400">Coupons are applied at checkout.</p>
            <Link
              href="/checkout"
              className={`btn-primary mt-5 w-full ${items.some((i) => !i.available) ? 'pointer-events-none opacity-50' : ''}`}
            >
              Proceed to checkout
            </Link>
            <p className="mt-3 text-center text-xs text-gray-400">Visa · Mastercard · PayPal</p>
          </div>
        </div>
      )}
    </div>
  );
}
