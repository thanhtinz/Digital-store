import Link from 'next/link';
import prisma from '@/lib/db';
import { toProductCards, productCardInclude } from '@/lib/catalog';
import ProductCardView from '@/components/ProductCardView';
import { clampInt } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'All Products' };

const SORTS: Record<string, any> = {
  newest: { id: 'desc' },
  popular: { soldCount: 'desc' },
  rating: { ratingAvg: 'desc' },
};

type Search = { q?: string; category?: string; sort?: string; page?: string };

export default async function ProductsPage({ searchParams }: { searchParams: Search }) {
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
          <h1 className="text-2xl font-bold">{q ? `Search: “${q}”` : 'All Products'}</h1>
          <p className="mt-1 text-sm text-gray-500">{total.toLocaleString('en-US')} product{total === 1 ? '' : 's'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['popular', 'newest', 'rating'] as const).map((s) => (
            <Link
              key={s}
              href={buildUrl({ sort: s, page: '1' })}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${sort === s ? 'bg-brand-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'}`}
            >
              {s === 'popular' ? 'Best selling' : s === 'newest' ? 'Newest' : 'Top rated'}
            </Link>
          ))}
        </div>
      </div>

      {/* Category filter chips */}
      {categories.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <Link
            href={buildUrl({ category: undefined as any, page: '1' })}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${!searchParams.category ? 'bg-gray-900 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'}`}
          >
            All
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={buildUrl({ category: c.slug, page: '1' })}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${searchParams.category === c.slug ? 'bg-gray-900 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'}`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}

      {products.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => <ProductCardView key={p.id} product={p} />)}
        </div>
      ) : (
        <div className="card p-16 text-center text-gray-500">No products match your search.</div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={buildUrl({ page: String(p) })}
              className={`grid h-9 w-9 place-items-center rounded-lg text-sm font-semibold ${p === page ? 'bg-brand-600 text-white' : 'bg-white border border-gray-300 hover:bg-gray-100'}`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
