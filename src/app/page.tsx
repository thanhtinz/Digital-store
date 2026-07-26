import Link from 'next/link';
import prisma from '@/lib/db';
import { toProductCards, productCardInclude } from '@/lib/catalog';
import BannerCarousel from '@/components/BannerCarousel';
import Countdown from '@/components/Countdown';
import ProductCardView from '@/components/ProductCardView';
import { formatMoney } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const now = new Date();
  const [banners, categories, flashSale, featuredRaw, latestRaw] = await Promise.all([
    prisma.banner.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }], take: 6 }),
    prisma.category.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }),
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
          <h2 className="mb-4 text-xl font-bold">Browse categories</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-lg">📦</span>
                )}
                <span className="text-sm font-semibold group-hover:text-brand-600">{c.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Flash sale */}
      {flashSale && flashSale.items.length > 0 && (
        <section className="rounded-2xl bg-gradient-to-r from-red-600 to-orange-500 p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-white sm:text-xl">
              ⚡ {flashSale.name}
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-white/90">Ends in</span>
              <Countdown until={flashSale.endsAt.toISOString()} />
              <Link href="/flash-sale" className="rounded-lg bg-white/20 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/30">
                View all →
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
                      <div className="grid h-full place-items-center text-3xl text-gray-300">🛍️</div>
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

      {/* Trust strip */}
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ['⚡', 'Instant delivery', 'Most orders are delivered automatically, seconds after payment.'],
          ['🔒', 'Secure checkout', 'Pay with Visa, Mastercard or PayPal through Stripe & PayPal.'],
          ['💬', 'Real support', 'Questions or issues? Our support team answers fast.'],
        ].map(([icon, title, desc]) => (
          <div key={title} className="card flex items-start gap-3 p-5">
            <span className="text-2xl">{icon}</span>
            <div>
              <p className="font-semibold">{title}</p>
              <p className="mt-1 text-sm text-gray-500">{desc}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
