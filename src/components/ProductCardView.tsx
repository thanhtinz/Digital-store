import Link from 'next/link';
import type { ProductCard } from '@/lib/catalog';
import { formatMoney } from '@/lib/utils';

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i <= Math.round(value) ? '#f59e0b' : '#e5e7eb'}>
          <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3l-6.1 3.3 1.4-6.8L2.2 9.1l6.9-.8L12 2z" />
        </svg>
      ))}
    </span>
  );
}

export default function ProductCardView({ product }: { product: ProductCard }) {
  return (
    <Link
      href={`/product/${product.slug}`}
      className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-4xl text-gray-300">🛍️</div>
        )}
        {product.onSale && (
          <span className="badge absolute left-2 top-2 bg-red-600 text-white">SALE</span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        {product.categoryName && (
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-600">{product.categoryName}</p>
        )}
        <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug">{product.name}</h3>
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500">
          <Stars value={product.ratingAvg} />
          <span>({product.ratingCount})</span>
          {product.soldCount > 0 && <span>· {product.soldCount.toLocaleString('en-US')} sold</span>}
        </div>
        <div className="mt-auto flex items-baseline gap-2 pt-2">
          <span className="text-base font-bold text-gray-900">
            {product.minPrice > 0 ? formatMoney(product.minPrice) : 'Free'}
          </span>
          {product.onSale && product.minOriginal > product.minPrice && (
            <span className="text-xs text-gray-400 line-through">{formatMoney(product.minOriginal)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
