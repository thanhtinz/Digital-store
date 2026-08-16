import Link from 'next/link';
import prisma from '@/lib/db';
import { toProductCards, productCardInclude } from '@/lib/catalog';
import { getFeatures } from '@/lib/features';
import BannerCarousel from '@/components/BannerCarousel';
import Countdown from '@/components/Countdown';
import ProductCardView, { Stars } from '@/components/ProductCardView';

import Icon from '@/components/icons';
import { getMoneyFormatter } from '@/lib/currency';

export const dynamic = 'force-dynamic';

// Category tiles cycle through these so a catalog without artwork still reads
// as a designed grid rather than a row of grey boxes.
const TILE_TINTS = [
  'from-indigo-500 to-violet-600',
  'from-sky-500 to-blue-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-fuchsia-500 to-purple-600',
];

// A row should always come out full. Small catalogs get fewer, wider columns
// instead of a four-column grid with a ragged hole on the right.
function productCols(n: number) {
  if (n >= 4) return 'grid-cols-2 lg:grid-cols-4';
  if (n === 3) return 'grid-cols-2 sm:grid-cols-3';
  return 'grid-cols-2';
}

function flashCols(n: number) {
  if (n >= 6) return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6';
  if (n >= 4) return 'grid-cols-2 sm:grid-cols-4';
  if (n === 3) return 'grid-cols-2 sm:grid-cols-3';
  return 'grid-cols-2';
}

const STEPS = [
  { icon: 'bag', title: 'Pick your package', text: 'Every product lists its tiers and exactly what you receive.' },
  { icon: 'credit-card', title: 'Pay your way', text: 'Card, PayPal or wallet balance — checkout takes under a minute.' },
  { icon: 'bolt', title: 'Get it instantly', text: 'Codes land on your order page and inbox the moment payment clears.' },
];

export default async function HomePage() {
  const money = await getMoneyFormatter();
  const now = new Date();
  const feats = await getFeatures();
  const [banners, categories, flashSale, featuredRaw, latestRaw, stats, testimonials] = await Promise.all([
    prisma.banner.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }], take: 6 }),
    prisma.category.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }], include: { _count: { select: { products: { where: { isActive: true } } } } } }),
    !feats.flash_sale ? Promise.resolve(null) : prisma.flashSale.findFirst({
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
    Promise.all([
      prisma.product.count({ where: { isActive: true } }),
      prisma.order.count({ where: { status: { in: ['PAID', 'COMPLETED'] } } }),
      prisma.review.aggregate({ where: { isApproved: true }, _avg: { rating: true }, _count: true }),
    ]),
    !feats.reviews
      ? Promise.resolve([])
      : prisma.review.findMany({
          where: { isApproved: true, rating: { gte: 4 }, content: { not: null } },
          orderBy: { createdAt: 'desc' },
          take: 3,
          include: { user: { select: { name: true } }, product: { select: { name: true, slug: true } } },
        }),
  ]);

  const [productCount, orderCount, ratingAgg] = stats;
  const avgRating = Math.round((ratingAgg._avg.rating || 0) * 10) / 10;

  // Top sellers back-fill the featured row so it never ends in a ragged gap.
  const featuredIds = featuredRaw.map((p) => p.id);
  const fillers = featuredRaw.length >= 4
    ? []
    : await prisma.product.findMany({
        where: { isActive: true, id: { notIn: featuredIds } },
        orderBy: { soldCount: 'desc' },
        take: 4 - featuredRaw.length,
        include: productCardInclude,
      });

  const [featured, latest] = await Promise.all([
    toProductCards([...featuredRaw, ...fillers]),
    toProductCards(latestRaw),
  ]);

  const heroStats = [
    { value: productCount.toLocaleString('en-US'), label: 'Products in stock' },
    { value: orderCount > 0 ? `${orderCount.toLocaleString('en-US')}+` : 'Instant', label: orderCount > 0 ? 'Orders delivered' : 'Automated delivery' },
    { value: avgRating > 0 ? `${avgRating}/5` : '24/7', label: avgRating > 0 ? `From ${ratingAgg._count} reviews` : 'Human support' },
  ];

  return (
    <div className="space-y-14 pb-16 sm:space-y-16">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gray-950">
        {/* Ambient colour wash + grid texture */}
        <div className="pointer-events-none absolute -left-40 -top-40 h-[26rem] w-[26rem] rounded-full bg-brand-600/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-52 right-0 h-[30rem] w-[30rem] rounded-full bg-brand-400/25 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.6) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)',
          }}
        />

        <div className="container relative py-14 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/90 backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Automated delivery, live right now
            </span>

            <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Digital goods,
              <span className="bg-gradient-to-r from-brand-200 via-brand-300 to-brand-100 bg-clip-text text-transparent"> delivered in seconds</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-gray-300 sm:text-lg">
              Streaming subscriptions, game credits and software licenses — paid for securely and sent to you the moment
              your payment clears.
            </p>

            {/* Search is the primary action: shoppers arrive knowing what they want */}
            <form action="/products" method="get" className="mx-auto mt-7 flex max-w-xl gap-2">
              <div className="relative flex-1">
                <Icon name="search" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  name="q"
                  placeholder="Search for a subscription, game or license..."
                  aria-label="Search products"
                  className="h-12 w-full rounded-xl border border-white/15 bg-white/10 pl-11 pr-4 text-sm text-white outline-none backdrop-blur transition placeholder:text-gray-400 focus:border-brand-400 focus:bg-white/15"
                />
              </div>
              <button className="btn-primary h-12 shrink-0 px-5">Search</button>
            </form>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-gray-300">
              {[
                ['bolt', 'Instant delivery'],
                ['shield', 'Buyer protection'],
                ['lock', 'Encrypted checkout'],
                ['chat', '24/7 human support'],
              ].map(([icon, label]) => (
                <span key={label} className="inline-flex items-center gap-1.5">
                  <Icon name={icon} size={14} className="text-brand-300" /> {label}
                </span>
              ))}
            </div>
          </div>

          {/* Live numbers, straight from the database */}
          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/[.06] backdrop-blur">
            {heroStats.map((s) => (
              <div key={s.label} className="px-3 py-4 text-center sm:px-6 sm:py-5">
                <p className="text-xl font-extrabold text-white sm:text-2xl">{s.value}</p>
                <p className="mt-0.5 text-[11px] text-gray-400 sm:text-xs">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="container space-y-14 sm:space-y-16">
        {/* ── Promotional banners ─────────────────────────────────── */}
        {banners.length > 0 && <BannerCarousel banners={banners as any} />}

        {/* ── Categories ──────────────────────────────────────────── */}
        {categories.length > 0 && (
          <section>
            <div className="mb-5 flex items-end justify-between gap-3">
              <div>
                <p className="section-eyebrow">Catalog</p>
                <h2 className="mt-1 text-xl font-bold sm:text-2xl">Shop by category</h2>
              </div>
              <Link href="/products" className="view-all">All products <Icon name="arrow-right" size={14} /></Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((c, i) => (
                <Link
                  key={c.id}
                  href={`/category/${c.slug}`}
                  className="group relative flex h-36 flex-col justify-end overflow-hidden rounded-2xl p-5 text-white shadow-[0_10px_30px_-18px_rgba(16,24,40,.5)] transition-transform duration-300 hover:-translate-y-1"
                >
                  {c.imageUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={c.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                      <span className="absolute inset-0 bg-gradient-to-t from-gray-950/85 via-gray-950/35 to-transparent" />
                    </>
                  ) : (
                    <span className={`absolute inset-0 bg-gradient-to-br ${TILE_TINTS[i % TILE_TINTS.length]}`}>
                      <span className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/15" />
                      <span className="absolute -bottom-10 left-8 h-24 w-24 rounded-full bg-white/10" />
                    </span>
                  )}
                  <span className="relative flex items-end justify-between gap-3">
                    <span>
                      <span className="block text-lg font-bold drop-shadow-sm">{c.name}</span>
                      <span className="block text-xs text-white/80">
                        {c._count.products} product{c._count.products === 1 ? '' : 's'}
                      </span>
                    </span>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/20 backdrop-blur transition group-hover:bg-white group-hover:text-gray-900">
                      <Icon name="arrow-right" size={16} />
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Flash sale ──────────────────────────────────────────── */}
        {flashSale && flashSale.items.length > 0 && (
          <section className="relative overflow-hidden rounded-3xl bg-gray-950 p-5 shadow-[0_24px_48px_-28px_rgba(16,24,40,.6)] sm:p-7">
            <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-red-600/35 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 right-0 h-72 w-72 rounded-full bg-orange-500/25 blur-3xl" />

            <div className="relative mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="inline-flex items-center gap-1.5 rounded-full bg-red-600/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.14em] text-red-300">
                  <Icon name="bolt" size={12} /> Limited-time deals
                </p>
                <h2 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">{flashSale.name}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-gray-400">Ends in</span>
                <Countdown until={flashSale.endsAt.toISOString()} />
                <Link href="/flash-sale" className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-bold text-gray-900 shadow-md transition hover:bg-gray-100">
                  View all <Icon name="arrow-right" size={14} />
                </Link>
              </div>
            </div>

            <div className={`relative grid gap-3 ${flashCols(Math.min(6, flashSale.items.length))}`}>
              {flashSale.items.slice(0, 6).map((item) => {
                const soldOut = item.quantityLimit != null && item.soldCount >= item.quantityLimit;
                const left = item.quantityLimit != null ? Math.max(0, item.quantityLimit - item.soldCount) : null;
                const pct = Number(item.package.price) > 0
                  ? Math.round((1 - Number(item.salePrice) / Number(item.package.price)) * 100)
                  : 0;
                return (
                  <Link
                    key={item.id}
                    href={`/product/${item.package.product.slug}`}
                    className="group overflow-hidden rounded-2xl bg-white/[.07] ring-1 ring-white/10 backdrop-blur transition duration-300 hover:-translate-y-1 hover:bg-white/[.12]"
                  >
                    <div className="relative aspect-[4/3] bg-gray-800">
                      {item.package.product.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.package.product.images[0].url} alt={item.package.product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="grid h-full place-items-center text-gray-600"><Icon name="bag" size={34} /></div>
                      )}
                      {pct > 0 && (
                        <span className="badge absolute left-2 top-2 bg-red-600 text-white shadow-sm">-{pct}%</span>
                      )}
                      {soldOut && (
                        <div className="absolute inset-0 grid place-items-center bg-gray-950/70 text-xs font-bold uppercase tracking-wider text-white">Sold out</div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-1 text-xs font-semibold text-white">{item.package.product.name}</p>
                      <p className="line-clamp-1 text-[11px] text-gray-400">{item.package.name}</p>
                      <div className="mt-1.5 flex items-baseline gap-1.5">
                        <span className="text-sm font-extrabold text-white">{money(Number(item.salePrice))}</span>
                        <span className="text-[11px] text-gray-500 line-through">{money(Number(item.package.price))}</span>
                      </div>
                      {left !== null && !soldOut && (
                        <div className="mt-2">
                          <div className="h-1 overflow-hidden rounded-full bg-white/15">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-400"
                              style={{ width: `${Math.min(100, Math.round((item.soldCount / item.quantityLimit!) * 100))}%` }}
                            />
                          </div>
                          <p className="mt-1 text-[10px] font-medium text-gray-400">{left} left at this price</p>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Featured ────────────────────────────────────────────── */}
        {featured.length > 0 && (
          <section>
            <div className="mb-5 flex items-end justify-between gap-3">
              <div>
                <p className="section-eyebrow">Hand-picked</p>
                <h2 className="mt-1 text-xl font-bold sm:text-2xl">Featured products</h2>
              </div>
              <Link href="/products" className="view-all">View all <Icon name="arrow-right" size={14} /></Link>
            </div>
            <div className={`grid gap-4 ${productCols(Math.min(8, featured.length))}`}>
              {featured.slice(0, 8).map((p) => <ProductCardView key={p.id} product={p} />)}
            </div>
          </section>
        )}

        {/* ── How it works ────────────────────────────────────────── */}
        <section className="rounded-3xl border border-gray-200/80 bg-white p-6 sm:p-8">
          <div className="mb-6 text-center">
            <p className="section-eyebrow">How it works</p>
            <h2 className="mt-1 text-xl font-bold sm:text-2xl">From checkout to code in three steps</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="relative rounded-2xl bg-gray-50 p-5">
                <span className="absolute right-4 top-3 text-4xl font-extrabold text-gray-200/90">{i + 1}</span>
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-600 text-white shadow-[0_8px_20px_-10px_rgba(79,70,229,.9)]">
                  <Icon name={s.icon} size={20} />
                </span>
                <h3 className="relative mt-3 text-sm font-bold">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-500">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── New arrivals ────────────────────────────────────────── */}
        <section>
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <p className="section-eyebrow">Just added</p>
              <h2 className="mt-1 text-xl font-bold sm:text-2xl">New arrivals</h2>
            </div>
            <Link href="/products?sort=newest" className="view-all">View all <Icon name="arrow-right" size={14} /></Link>
          </div>
          {latest.length > 0 ? (
            <div className={`grid gap-4 ${productCols(Math.min(8, latest.length))}`}>
              {latest.slice(0, 8).map((p) => <ProductCardView key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="card p-12 text-center text-gray-500">
              No products yet — add some in the <Link href="/admin" className="text-brand-600 underline">admin panel</Link>.
            </div>
          )}
        </section>

        {/* ── Customer reviews ────────────────────────────────────── */}
        {testimonials.length > 0 && (
          <section>
            <div className="mb-5 flex items-end justify-between gap-3">
              <div>
                <p className="section-eyebrow">Social proof</p>
                <h2 className="mt-1 text-xl font-bold sm:text-2xl">What customers say</h2>
              </div>
              <Link href="/reviews" className="view-all">All reviews <Icon name="arrow-right" size={14} /></Link>
            </div>
            <div className={`grid gap-4 ${testimonials.length >= 3 ? 'sm:grid-cols-3' : testimonials.length === 2 ? 'sm:grid-cols-2' : ''}`}>
              {testimonials.map((r) => (
                <figure key={r.id} className="card flex flex-col p-5">
                  <Stars value={r.rating} />
                  <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-gray-700">
                    &ldquo;{r.content}&rdquo;
                  </blockquote>
                  <figcaption className="mt-4 flex items-center gap-2.5 border-t border-gray-100 pt-3">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                      {(r.user.name || 'A').charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-gray-900">{r.user.name || 'Verified buyer'}</span>
                      <Link href={`/product/${r.product.slug}`} className="block truncate text-[11px] text-gray-400 hover:text-brand-600">
                        on {r.product.name}
                      </Link>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* ── Closing call to action ──────────────────────────────── */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 px-6 py-10 text-center sm:px-10 sm:py-12">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-white/[.07]" />
          <h2 className="relative text-2xl font-extrabold text-white sm:text-3xl">Ready when you are</h2>
          <p className="relative mx-auto mt-2 max-w-lg text-sm text-white/85 sm:text-base">
            Browse the full catalog, or send someone a gift card and let them pick.
          </p>
          <div className="relative mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/products" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-brand-700 shadow-lg transition hover:bg-gray-50">
              <Icon name="bag" size={16} /> Browse all products
            </Link>
            {feats.giftcards && (
              <Link href="/gift-cards" className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20">
                <Icon name="gift" size={16} /> Send a gift card
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
