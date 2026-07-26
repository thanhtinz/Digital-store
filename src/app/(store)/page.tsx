import Link from 'next/link';
import prisma from '@/lib/db';
import { toProductCards, productCardInclude } from '@/lib/catalog';
import BannerCarousel from '@/components/BannerCarousel';
import Countdown from '@/components/Countdown';
import ProductCardView from '@/components/ProductCardView';
import { formatMoney } from '@/lib/utils';
import Icon from '@/components/icons';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const now = new Date();
  const [banners, categories, flashSale, featuredRaw, latestRaw] = await Promise.all([
    prisma.banner.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }], take: 6 }),
    prisma.category.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }], include: { _count: { select: { products: { where: { isActive: true } } } } } }),
    prisma.flashSale.findFirst({
      where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
      orderBy: { endsAt: 'asc' },
      include: {
        items: {
          include: {
            package: {
              include: { product: { include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } } } },
            },
          },
        },
      },
    }),
    prisma.product.findMany({
      where: { isActive: true, isFeatured: true },
      orderBy: { soldCount: 'desc' },
      take: 8,
      include: productCardInclude,
    }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { id: 'desc' },
      take: 8,
      include: productCardInclude,
    }),
  ]);

  const [featured, latest] = await Promise.all([toProductCards(featuredRaw), toProductCards(latestRaw)]);

  // Genuine live numbers for the stats strip.
  const [productCount, deliveredCount, reviewAgg] = await Promise.all([
    prisma.product.count({ where: { isActive: true } }),
    prisma.order.count({ where: { status: 'COMPLETED' } }),
    prisma.review.aggregate({ where: { isApproved: true }, _count: true, _avg: { rating: true } }),
  ]);
  const stats: Array<[string, string, string]> = [
    ['bag', String(productCount), 'Digital products'],
    ['check', deliveredCount.toLocaleString('en-US'), 'Orders delivered'],
    ['star', reviewAgg._count ? `${(reviewAgg._avg.rating || 0).toFixed(1)}/5` : 'New', 'Average rating'],
    ['bolt', '< 1 min', 'Typical delivery time'],
  ];

  return (
    <div className="container space-y-12 py-6">
      {/* Hero banners */}
      {banners.length > 0 && <BannerCarousel banners={banners as any} />}

      {/* Categories */}
      {categories.length > 0 && (
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold">Browse categories</h2>
            <p className="mt-0.5 text-sm text-gray-500">Find exactly what you need, faster.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:[grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/category/${c.slug}`}
                className="card group flex items-center gap-3 p-4 transition hover:border-brand-300 hover:shadow-md"
              >
                {c.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.imageUrl} alt={c.name} className="h-10 w-10 rounded-lg object-cover" />
                ) : (
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-600"><Icon name="folder" size={20} /></span>
                )}
                <span>
                  <span className="block text-sm font-semibold group-hover:text-brand-600">{c.name}</span>
                  <span className="block text-xs text-gray-400">{c._count.products} product{c._count.products === 1 ? '' : 's'}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Live store stats */}
      <section className="grid grid-cols-2 gap-3 rounded-2xl bg-gray-900 p-5 text-white sm:p-6 lg:grid-cols-4">
        {stats.map(([icon, value, label]) => (
          <div key={label} className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/10">
              <Icon name={icon} size={19} />
            </span>
            <span>
              <span className="block text-xl font-extrabold leading-tight">{value}</span>
              <span className="block text-xs text-gray-400">{label}</span>
            </span>
          </div>
        ))}
      </section>

      {/* Flash sale */}
      {flashSale && flashSale.items.length > 0 && (
        <section className="rounded-2xl bg-gradient-to-r from-red-600 to-orange-500 p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-white sm:text-xl">
              <Icon name="bolt" size={20} /> {flashSale.name}
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-white/90">Ends in</span>
              <Countdown until={flashSale.endsAt.toISOString()} />
              <Link href="/flash-sale" className="rounded-lg bg-white/20 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/30">
                View all →
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:[grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
            {flashSale.items.slice(0, 5).map((item) => {
              const soldOut = item.quantityLimit != null && item.soldCount >= item.quantityLimit;
              const pct = Number(item.package.price) > 0
                ? Math.round((1 - Number(item.salePrice) / Number(item.package.price)) * 100)
                : 0;
              return (
                <Link
                  key={item.id}
                  href={`/product/${item.package.product.slug}`}
                  className="group overflow-hidden rounded-xl bg-white"
                >
                  <div className="relative aspect-[4/3] bg-gray-100">
                    {item.package.product.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.package.product.images[0].url} alt={item.package.product.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                    ) : (
                      <div className="grid h-full place-items-center text-gray-300"><Icon name="bag" size={36} /></div>
                    )}
                    {pct > 0 && <span className="badge absolute left-2 top-2 bg-red-600 text-white">-{pct}%</span>}
                    {soldOut && (
                      <div className="absolute inset-0 grid place-items-center bg-black/50 text-sm font-bold text-white">SOLD OUT</div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="line-clamp-1 text-xs font-semibold">{item.package.product.name}</p>
                    <p className="text-[11px] text-gray-500">{item.package.name}</p>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-sm font-bold text-red-600">{formatMoney(Number(item.salePrice))}</span>
                      <span className="text-[11px] text-gray-400 line-through">{formatMoney(Number(item.package.price))}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Featured */}
      {featured.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Featured products</h2>
            <Link href="/products" className="text-sm font-semibold text-brand-600 hover:underline">View all →</Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((p) => <ProductCardView key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* New arrivals */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">New arrivals</h2>
          <Link href="/products?sort=newest" className="text-sm font-semibold text-brand-600 hover:underline">View all →</Link>
        </div>
        {latest.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {latest.map((p) => <ProductCardView key={p.id} product={p} />)}
          </div>
        ) : (
          <div className="card p-12 text-center text-gray-500">
            No products yet — add some in the <Link href="/admin" className="text-brand-600 underline">admin panel</Link>.
          </div>
        )}
      </section>


    </div>
  );
}
