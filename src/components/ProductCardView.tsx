'use client';

import Link from 'next/link';
import type { ProductCard } from '@/lib/catalog';

import Icon from './icons';
import { useMoney } from '@/components/Providers';
import { formatNumber } from '@/lib/utils';
import { INTL_LOCALE } from '@/i18n';
import { useStore, useT } from '@/components/Providers';

export function Stars({ value, size = 14, color = '#f59e0b' }: { value: number; size?: number; color?: string }) {
  const t = useT();
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={t('catalog.starsAria', { value })}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i <= Math.round(value) ? color : '#e5e7eb'}>
          <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3l-6.1 3.3 1.4-6.8L2.2 9.1l6.9-.8L12 2z" />
        </svg>
      ))}
    </span>
  );
}

// Shopee-style card on frosted glass: square artwork, a yellow discount
// flag in the top corner, a "Yêu thích+" ribbon on featured products, the
// price in brand colour and the sold count under the rating.
export default function ProductCardView({ product }: { product: ProductCard }) {
  const intlLocale = INTL_LOCALE[useStore().locale];
  const money = useMoney();
  const t = useT();
  const pct = product.onSale && product.minOriginal > product.minPrice
    ? Math.round((1 - product.minPrice / product.minOriginal) * 100)
    : 0;
  return (
    <Link
      href={`/product/${product.slug}`}
      className="card card-hover group relative flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1"
    >
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-white/70 to-brand-50/60">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.07]"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-brand-200"><Icon name="bag" size={44} /></div>
        )}
        {/* Soft bottom fade so badges/edges blend into the card body */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/[.06] to-transparent" />
        {product.isFeatured && (
          <span className="absolute -left-1 top-2.5 rounded-r-full bg-gradient-to-r from-brand-700 to-brand-500 py-0.5 pe-2.5 ps-3 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-md ring-1 ring-white/40">
            {t('catalog.favoritePlus')}
          </span>
        )}
        {pct > 0 && (
          <span
            className="absolute right-0 top-0 flex flex-col items-center bg-yellow-300 px-1.5 pb-2 pt-1 text-brand-700 shadow-sm [clip-path:polygon(0_0,100%_0,100%_100%,50%_82%,0_100%)]"
          >
            <span className="text-xs font-extrabold leading-none">-{pct}%</span>
            <span className="mt-0.5 text-[9px] font-bold uppercase leading-none text-brand-600">{t('catalog.off')}</span>
          </span>
        )}
        {product.onSale && pct === 0 && (
          <span className="badge absolute left-2.5 top-2.5 gap-1 bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-lg ring-1 ring-white/30">
            <Icon name="bolt" size={11} /> {t('catalog.saleBadge')}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        {product.categoryName && (
          <p className="text-[11px] font-bold uppercase tracking-[.12em] text-brand-600">{product.categoryName}</p>
        )}
        <h3 className="mt-1 line-clamp-2 text-sm font-medium leading-snug transition-colors group-hover:text-brand-700">{product.name}</h3>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
          <Stars value={product.ratingAvg} />
          <span className="font-medium text-gray-600">({product.ratingCount})</span>
          {product.soldCount > 0 && <span className="text-gray-400">· {t('product.sold', { count: formatNumber(product.soldCount, intlLocale) })}</span>}
        </div>
        <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
          <Icon name="bolt" size={11} /> {t('home.trustInstant')}
        </p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-lg font-extrabold tracking-tight text-brand-600">
              {product.minPrice > 0 ? money(product.minPrice) : t('common.free')}
            </span>
            {product.onSale && product.minOriginal > product.minPrice && (
              <span className="text-xs font-medium text-gray-400 line-through">{money(product.minOriginal)}</span>
            )}
          </span>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50/80 text-brand-500 ring-1 ring-brand-100 backdrop-blur transition-all duration-300 group-hover:bg-brand-600 group-hover:text-white group-hover:shadow-btn-primary group-hover:ring-brand-600">
            <Icon name="arrow-right" size={15} />
          </span>
        </div>
      </div>
    </Link>
  );
}
