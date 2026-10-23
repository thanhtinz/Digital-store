'use client';

import { useEffect, useState } from 'react';
import { useT } from './Providers';
import { api } from '@/lib/client';
import ProductCardView from './ProductCardView';
import type { ProductCard } from '@/lib/catalog';

// Recently viewed products live entirely in the browser: slugs, newest
// first, at most 10, no duplicates. Guests and members alike get the rail.
const STORAGE_KEY = 'ds_recently_viewed';
const MAX_ITEMS = 10;

function readSlugs(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string').slice(0, MAX_ITEMS) : [];
  } catch {
    return [];
  }
}

// Mounted on the product page: records the visit, renders nothing.
export function TrackRecentView({ slug }: { slug: string }) {
  useEffect(() => {
    try {
      const next = [slug, ...readSlugs().filter((s) => s !== slug)].slice(0, MAX_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable (private mode) — the rail simply never shows.
    }
  }, [slug]);
  return null;
}

// Horizontal rail of the products this browser viewed most recently.
// Renders only when at least two products remain after exclusions.
export function RecentlyViewedRail({ excludeSlug, className = '' }: { excludeSlug?: string; className?: string }) {
  const t = useT();
  const [cards, setCards] = useState<ProductCard[] | null>(null);

  useEffect(() => {
    const slugs = readSlugs().filter((s) => s !== excludeSlug);
    if (slugs.length < 2) {
      setCards([]);
      return;
    }
    let cancelled = false;
    api<{ products: ProductCard[] }>(`/api/products/recent?slugs=${encodeURIComponent(slugs.join(','))}`)
      .then((d) => { if (!cancelled) setCards(d.products || []); })
      .catch(() => { if (!cancelled) setCards([]); });
    return () => { cancelled = true; };
  }, [excludeSlug]);

  if (!cards || cards.length < 2) return null;

  return (
    <section className={className}>
      <div className="mb-4 flex items-end justify-between gap-3">
        <h2 className="text-xl font-extrabold uppercase tracking-wide text-brand-600 sm:text-2xl">{t('home.recentlyViewed')}</h2>
      </div>
      <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden px-1 pb-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {cards.map((p) => (
          <div key={p.id} className="w-44 shrink-0 snap-start sm:w-48 lg:w-52">
            <ProductCardView product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}
