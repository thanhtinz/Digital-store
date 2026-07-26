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


  return (
    <div className="container space-y-12 py-6">
      {/* Hero banners */}
      {banners.length > 0 && <BannerCarousel banners={banners as any} />}

      {/* Categories */}
      {categories.length > 0 && (
        <section>
          <div className="mb-5">
            <p className="section-eyebrow">Catalog</p>
            <h2 className="mt-1 text-xl font-bold sm:text-2xl">Browse categories</h2>
            <p className="mt-1 text-sm text-gray-500">Find exactly what you need, faster.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:[grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/category/${c.slug}`}
                className="card group flex items-center gap-3 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-[0_16px_28px_-18px_rgba(79,70,229,.35)]"
              >
                {c.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.imageUrl} alt={c.name} className="h-11 w-11 rounded-xl object-cover" />
                ) : (
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600 transition-colors group-hover:from-brand-600 group-hover:to-brand-700 group-hover:text-white">
                    <Icon name="folder" size={20} />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold group-hover:text-brand-700">{c.name}</span>
                  <span className="block whitespace-nowrap text-xs text-gray-400">{c._count.products} product{c._count.products === 1 ? '' : 's'}</span>
                </span>
                <Icon name="chevron-right" size={16} className="hidden shrink-0 text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-brand-500 sm:block" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Flash sale */}
      {flashSale && flashSale.items.length > 0 && (
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-red-500 to-orange-500 p-4 shadow-[0_24px_48px_-24px_rgba(220,38,38,.5)] sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-white/5" />
          <div className="relative mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.14em] text-white/80">
                <Icon name="bolt" size={13} /> Limited-time deals
              </p>
              <h2 className="mt-0.5 text-xl font-extrabold text-white sm:text-2xl">{flashSale.name}</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-white/90">Ends in</span>
              <Countdown until={flashSale.endsAt.toISOString()} />
              <Link href="/flash-sale" className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-bold text-red-600 shadow-md transition hover:bg-red-50">
                View all <Icon name="arrow-right" size={14} />
              </Link>
            </div>
          </div>
          <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:[grid-template-columns:repeat(auto-fill,minmax(170px,1fr))]">
            {flashSale.items.slice(0, 6).map((item) => {
              const soldOut = item.quantityLimit != null && item.soldCount >= item.quantityLimit;
              const pct = Number(item.package.price) > 0
                ? Math.round((1 - Number(item.salePrice) / Number(item.package.price)) * 100)
                : 0;
              return (
                <Link
                  key={item.id}
                  href={`/product/${item.package.product.slug}`}
                  className="group overflow-hidden rounded-2xl bg-white shadow-md transition-transform duration-300 hover:-translate-y-1"
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
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <p className="section-eyebrow">Hand-picked</p>
              <h2 className="mt-1 text-xl font-bold sm:text-2xl">Featured products</h2>
            </div>
            <Link href="/products" className="view-all">View all <Icon name="arrow-right" size={14} /></Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:[grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
            {featured.map((p) => <ProductCardView key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* New arrivals */}
      <section>
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="section-eyebrow">Just added</p>
            <h2 className="mt-1 text-xl font-bold sm:text-2xl">New arrivals</h2>
          </div>
          <Link href="/products?sort=newest" className="view-all">View all <Icon name="arrow-right" size={14} /></Link>
        </div>
        {latest.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:[grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
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
