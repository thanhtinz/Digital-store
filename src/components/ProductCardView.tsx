'use client';

import Link from 'next/link';
import type { ProductCard } from '@/lib/catalog';

import Icon from './icons';
import { useMoney } from '@/components/Providers';
import { formatNumber } from '@/lib/utils';
import { INTL_LOCALE } from '@/i18n';
import { useStore, useT } from '@/components/Providers';

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const t = useT();
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={t('catalog.starsAria', { value })}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i <= Math.round(value) ? '#f59e0b' : '#e5e7eb'}>
          <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3l-6.1 3.3 1.4-6.8L2.2 9.1l6.9-.8L12 2z" />
        </svg>
      ))}
    </span>
  );
}

export default function ProductCardView({ product }: { product: ProductCard }) {
  const intlLocale = INTL_LOCALE[useStore().locale];
  const money = useMoney();
  const t = useT();
  return (
    <Link
      href={`/product/${product.slug}`}
      className="card card-hover group flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200/70">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.07]"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-gray-300"><Icon name="bag" size={44} /></div>
        )}
        {/* Soft bottom fade so badges/edges blend into the card body */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/[.06] to-transparent" />
        {product.onSale && (
          <span className="badge absolute left-2.5 top-2.5 gap-1 bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-lg ring-1 ring-white/30">
            <Icon name="bolt" size={11} /> {t('catalog.saleBadge')}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-[1.125rem]">
        {product.categoryName && (
          <p className="text-[11px] font-bold uppercase tracking-[.12em] text-brand-600">{product.categoryName}</p>
        )}
        <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-brand-700">{product.name}</h3>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
          <Stars value={product.ratingAvg} />
          <span className="font-medium text-gray-600">({product.ratingCount})</span>
          {product.soldCount > 0 && <span className="text-gray-400">· {t('product.sold', { count: formatNumber(product.soldCount, intlLocale) })}</span>}
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-4">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-lg font-extrabold tracking-tight text-gray-900">
              {product.minPrice > 0 ? money(product.minPrice) : t('common.free')}
            </span>
            {product.onSale && product.minOriginal > product.minPrice && (
              <span className="text-xs font-medium text-gray-400 line-through">{money(product.minOriginal)}</span>
            )}
          </span>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-500 ring-1 ring-brand-100 transition-all duration-300 group-hover:bg-brand-600 group-hover:text-white group-hover:shadow-btn-primary group-hover:ring-brand-600">
            <Icon name="arrow-right" size={15} />
          </span>
        </div>
      </div>
    </Link>
  );
}
