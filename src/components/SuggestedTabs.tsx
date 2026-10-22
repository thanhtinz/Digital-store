'use client';

import { useState } from 'react';
import type { ProductCard } from '@/lib/catalog';
import ProductCardView from './ProductCardView';
import Icon from './icons';
import { useT } from './Providers';

type TabKey = 'related' | 'newest' | 'best' | 'price';

type Props = {
  related: ProductCard[];
  newest: ProductCard[];
  best: ProductCard[];
  price: ProductCard[];
};

// "GỢI Ý HÔM NAY" with Shopee-style sort tabs. All four orderings are computed
// on the server from one product pool; switching is instant and client-side.
// The Price tab toggles ascending → descending on repeated clicks.
export default function SuggestedTabs({ related, newest, best, price }: Props) {
  const t = useT();
  const [tab, setTab] = useState<TabKey>('related');
  const [priceDesc, setPriceDesc] = useState(false);

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'related', label: t('home.tabRelated') },
    { key: 'newest', label: t('home.tabNewest') },
    { key: 'best', label: t('home.tabBest') },
    { key: 'price', label: t('home.tabPrice') },
  ];

  const lists: Record<TabKey, ProductCard[]> = {
    related,
    newest,
    best,
    price: priceDesc ? [...price].reverse() : price,
  };
  const items = lists[tab];

  const pick = (key: TabKey) => {
    if (key === 'price' && tab === 'price') {
      setPriceDesc((v) => !v);
    } else {
      setTab(key);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-1 gap-y-0 border-b border-white/60" role="tablist">
        {tabs.map(({ key, label }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={active}
              onClick={() => pick(key)}
              className={`relative -mb-px flex items-center gap-1 px-3.5 py-2.5 text-sm font-semibold transition sm:px-4 ${
                active ? 'text-brand-700' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {label}
              {key === 'price' && (
                <span className="flex flex-col leading-none">
                  <Icon
                    name="chevron-right"
                    size={9}
                    className={`-rotate-90 ${active && !priceDesc ? 'text-brand-600' : 'text-gray-300'}`}
                  />
                  <Icon
                    name="chevron-right"
                    size={9}
                    className={`rotate-90 ${active && priceDesc ? 'text-brand-600' : 'text-gray-300'}`}
                  />
                </span>
              )}
              {active && <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-full bg-brand-600" />}
            </button>
          );
        })}
      </div>

      {items.length > 0 ? (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((p) => (
            <ProductCardView key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-3xl border border-white/60 bg-white/55 px-6 py-10 text-center text-sm text-gray-500 backdrop-blur">
          {t('home.empty')}
        </p>
      )}
    </div>
  );
}
