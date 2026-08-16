import Link from 'next/link';
import prisma from '@/lib/db';
import { toProductCards, productCardInclude } from '@/lib/catalog';
import ProductCardView from '@/components/ProductCardView';
import { clampInt, formatNumber } from '@/lib/utils';
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
};

type Search = { q?: string; category?: string; sort?: string; page?: string };

export default async function ProductsPage({ searchParams }: { searchParams: Search }) {
  const intlLocale = INTL_LOCALE[getLocale()];
  const t = getT();
  const q = (searchParams.q || '').trim();
  const sort = SORTS[searchParams.sort || ''] ? searchParams.sort! : 'popular';
  const page = clampInt(searchParams.page, 1, 10_000, 1);
  const pageSize = 12;

  const where: any = { isActive: true };
  if (q) where.name = { contains: q, mode: 'insensitive' };
  if (searchParams.category) where.category = { slug: searchParams.category };

  const [raw, total, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: SORTS[sort],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: productCardInclude,
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }),
  ]);
  const products = await toProductCards(raw);
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const buildUrl = (patch: Partial<Search>) => {
    const params = new URLSearchParams();
    const merged = { q, category: searchParams.category, sort, page: String(page), ...patch };
    if (merged.q) params.set('q', merged.q);
    if (merged.category) params.set('category', merged.category);
    if (merged.sort && merged.sort !== 'popular') params.set('sort', merged.sort);
    if (merged.page && merged.page !== '1') params.set('page', merged.page);
    const qs = params.toString();
    return `/products${qs ? `?${qs}` : ''}`;
  };

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
        <div className="flex rounded-full border border-gray-200 bg-white p-1 shadow-sm">
          {(['popular', 'newest', 'rating'] as const).map((s) => (
            <Link
              key={s}
              href={buildUrl({ sort: s, page: '1' })}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${sort === s ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              {s === 'popular' ? t('catalog.sortPopular') : s === 'newest' ? t('catalog.sortNewest') : t('catalog.sortRating')}
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
