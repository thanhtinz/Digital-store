import Link from 'next/link';
import prisma from '@/lib/db';
import { toProductCards, productCardInclude, type ProductCard } from '@/lib/catalog';
import ProductCardView from '@/components/ProductCardView';
import { clampInt, formatNumber } from '@/lib/utils';
import { getMoneyFormatter } from '@/lib/currency';
import Icon from '@/components/icons';
import { INTL_LOCALE } from '@/i18n';
import { getLocale, getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  return { title: getT()('meta.products') };
}

const SORTS: Record<string, any> = {
  newest: { id: 'desc' },
  popular: { soldCount: 'desc' },
  rating: { ratingAvg: 'desc' },
  // Price sorts run in memory on the card's effective min price (flash-sale
  // aware), which Prisma cannot express over the packages relation.
  priceAsc: { soldCount: 'desc' },
  priceDesc: { soldCount: 'desc' },
};

type Search = { q?: string; category?: string; sort?: string; page?: string; min?: string; max?: string };

// Price bounds arrive as raw query params; only plain non-negative integers
// count — anything else means "no bound on that side".
function parseBound(value?: string): number | null {
  if (!value) return null;
  const v = value.trim();
  if (!/^\d{1,12}$/.test(v)) return null;
  const n = Number(v);
  return Number.isSafeInteger(n) ? n : null;
}

// Shopee-style quick ranges (amounts in the store's base currency).
const PRICE_PRESETS: Array<{ min: number | null; max: number | null }> = [
  { min: null, max: 100_000 },
  { min: 100_000, max: 300_000 },
  { min: 300_000, max: 500_000 },
  { min: 500_000, max: null },
];

export default async function ProductsPage({ searchParams }: { searchParams: Search }) {
  const intlLocale = INTL_LOCALE[getLocale()];
  const t = getT();
  const money = await getMoneyFormatter();
  const q = (searchParams.q || '').trim();
  const sort = SORTS[searchParams.sort || ''] ? searchParams.sort! : 'popular';
  const page = clampInt(searchParams.page, 1, 10_000, 1);
  const pageSize = 12;
  const minPrice = parseBound(searchParams.min);
  const maxPrice = parseBound(searchParams.max);
  const hasPriceFilter = minPrice !== null || maxPrice !== null;

  const where: any = { isActive: true };
  if (q) where.name = { contains: q, mode: 'insensitive' };
  if (searchParams.category) where.category = { slug: searchParams.category };

  const [raw, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: SORTS[sort],
      include: productCardInclude,
    }),
    prisma.category.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }),
  ]);

  // Cards carry the effective (flash-aware) min package price — the same
  // number the card displays — so filtering and price sorting stay honest.
  let cards = await toProductCards(raw);
  if (hasPriceFilter) {
    cards = cards.filter(
      (c) => (minPrice === null || c.minPrice >= minPrice) && (maxPrice === null || c.minPrice <= maxPrice)
    );
  }
  if (sort === 'priceAsc' || sort === 'priceDesc') {
    const dir = sort === 'priceAsc' ? 1 : -1;
    cards = [...cards].sort(
      (a, b) => dir * (a.minPrice - b.minPrice) || b.soldCount - a.soldCount || b.id - a.id
    );
  }
  const total = cards.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const products: ProductCard[] = cards.slice((page - 1) * pageSize, page * pageSize);

  const buildUrl = (patch: Partial<Search>) => {
    const params = new URLSearchParams();
    const merged = {
      q,
      category: searchParams.category,
      sort,
      page: String(page),
      min: minPrice !== null ? String(minPrice) : undefined,
      max: maxPrice !== null ? String(maxPrice) : undefined,
      ...patch,
    };
    if (merged.q) params.set('q', merged.q);
    if (merged.category) params.set('category', merged.category);
    if (merged.sort && merged.sort !== 'popular') params.set('sort', merged.sort);
    if (merged.page && merged.page !== '1') params.set('page', merged.page);
    if (merged.min) params.set('min', merged.min);
    if (merged.max) params.set('max', merged.max);
    const qs = params.toString();
    return `/products${qs ? `?${qs}` : ''}`;
  };

  const presetLabel = (p: (typeof PRICE_PRESETS)[number]) =>
    p.min === null
      ? t('catalog.priceUnder', { amount: money(p.max!) })
      : p.max === null
        ? t('catalog.priceOver', { amount: money(p.min) })
        : t('catalog.priceBetween', { from: money(p.min), to: money(p.max) });

  return (
    <div className="container py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-eyebrow">{q ? t('catalog.searchResults') : t('catalog.store')}</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{q ? `“${q}”` : t('catalog.allProducts')}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {total === 1 ? t('catalog.availableOne') : t('catalog.available', { count: formatNumber(total, intlLocale) })}
          </p>
        </div>
        <div className="flex flex-wrap justify-end rounded-full border border-gray-200 bg-white p-1 shadow-sm">
          {(['popular', 'newest', 'rating', 'priceAsc', 'priceDesc'] as const).map((s) => (
            <Link
              key={s}
              href={buildUrl({ sort: s, page: '1' })}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${sort === s ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              {s === 'popular'
                ? t('catalog.sortPopular')
                : s === 'newest'
                  ? t('catalog.sortNewest')
                  : s === 'rating'
                    ? t('catalog.sortRating')
                    : s === 'priceAsc'
                      ? t('catalog.sortPriceAsc')
                      : t('catalog.sortPriceDesc')}
            </Link>
          ))}
        </div>
      </div>

      {/* Category filter chips */}
      {categories.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <Link
            href={buildUrl({ category: undefined as any, page: '1' })}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold shadow-sm transition ${!searchParams.category ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900'}`}
          >
            {t('catalog.all')}
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={buildUrl({ category: c.slug, page: '1' })}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold shadow-sm transition ${searchParams.category === c.slug ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900'}`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}

      {/* Price range filter: quick Shopee-style ranges + a custom from/to form.
          Everything rides on the URL (?min=&max=) so filtered views are shareable. */}
      <div className="card mb-6 flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
        <span className="flex items-center gap-1.5 text-sm font-bold text-gray-700">
          <Icon name="ticket" size={15} className="text-brand-600" /> {t('catalog.priceRange')}
        </span>
        <div className="flex flex-wrap gap-2">
          {PRICE_PRESETS.map((p) => {
            const active = minPrice === p.min && maxPrice === p.max;
            return (
              <Link
                key={`${p.min}-${p.max}`}
                href={buildUrl({
                  min: p.min !== null ? String(p.min) : (undefined as any),
                  max: p.max !== null ? String(p.max) : (undefined as any),
                  page: '1',
                })}
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold shadow-sm transition ${active ? 'bg-brand-600 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:border-brand-300 hover:text-brand-700'}`}
              >
                {presetLabel(p)}
              </Link>
            );
          })}
        </div>
        <form method="get" action="/products" className="flex flex-wrap items-center gap-2">
          {q && <input type="hidden" name="q" value={q} />}
          {searchParams.category && <input type="hidden" name="category" value={searchParams.category} />}
          {sort !== 'popular' && <input type="hidden" name="sort" value={sort} />}
          <input
            name="min"
            type="number"
            min={0}
            step={1000}
            inputMode="numeric"
            defaultValue={minPrice ?? ''}
            placeholder={t('catalog.priceFrom')}
            aria-label={t('catalog.priceFrom')}
            className="input w-32 py-1.5 text-sm"
          />
          <span className="text-gray-400">–</span>
          <input
            name="max"
            type="number"
            min={0}
            step={1000}
            inputMode="numeric"
            defaultValue={maxPrice ?? ''}
            placeholder={t('catalog.priceTo')}
            aria-label={t('catalog.priceTo')}
            className="input w-32 py-1.5 text-sm"
          />
          <button type="submit" className="btn-primary px-4 py-1.5 text-sm">{t('catalog.priceApply')}</button>
          {hasPriceFilter && (
            <Link
              href={buildUrl({ min: undefined as any, max: undefined as any, page: '1' })}
              className="text-sm font-semibold text-gray-500 underline-offset-2 transition hover:text-brand-700 hover:underline"
            >
              {t('catalog.clearFilters')}
            </Link>
          )}
        </form>
      </div>

      {products.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:[grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
          {products.map((p) => <ProductCardView key={p.id} product={p} />)}
        </div>
      ) : (
        <div className="card p-16 text-center">
          <Icon name="search" size={44} className="mx-auto text-gray-300" />
          <p className="mt-4 font-semibold text-gray-700">{t('catalog.noMatch')}</p>
          <p className="mt-1 text-sm text-gray-500">{t('catalog.tryOther')}</p>
          <Link href="/products" className="btn-secondary mt-5 inline-flex">{t('catalog.clearFilters')}</Link>
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={buildUrl({ page: String(p) })}
              className={`grid h-10 w-10 place-items-center rounded-full text-sm font-semibold shadow-sm transition ${p === page ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 hover:border-brand-300 hover:text-brand-700'}`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
