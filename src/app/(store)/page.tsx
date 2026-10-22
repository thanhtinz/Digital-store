import Link from 'next/link';
import prisma from '@/lib/db';
import { toProductCards, productCardInclude } from '@/lib/catalog';
import { getFeatures } from '@/lib/features';
import BannerCarousel from '@/components/BannerCarousel';
import Countdown from '@/components/Countdown';
import ProductCardView, { Stars } from '@/components/ProductCardView';

import Icon from '@/components/icons';
import { getMoneyFormatter } from '@/lib/currency';
import { getT } from '@/i18n/server';
import type { TFunction } from '@/i18n';
import { formatNumber } from '@/lib/utils';
import { INTL_LOCALE } from '@/i18n';
import { getLocale } from '@/i18n/server';

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

function steps(t: TFunction) {
  return [
    { icon: 'bag', title: t('home.step1'), text: t('home.step1Text') },
    { icon: 'credit-card', title: t('home.step2'), text: t('home.step2Text') },
    { icon: 'bolt', title: t('home.step3'), text: t('home.step3Text') },
  ];
}

export default async function HomePage() {
  const intlLocale = INTL_LOCALE[getLocale()];
  const t = getT();
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
    { value: formatNumber(productCount, intlLocale), label: t('home.statProducts') },
    { value: orderCount > 0 ? `${formatNumber(orderCount, intlLocale)}+` : 'Instant', label: orderCount > 0 ? t('home.statOrders') : t('home.statAutomated') },
    { value: avgRating > 0 ? `${avgRating}/5` : '24/7', label: avgRating > 0 ? t('home.statReviews', { count: ratingAgg._count }) : t('home.statHuman') },
  ];

  return (
    <div className="space-y-16 pb-20 sm:space-y-20">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gray-950">
        {/* Ambient colour wash + grid texture */}
        <div className="pointer-events-none absolute -left-40 -top-40 h-[26rem] w-[26rem] animate-float rounded-full bg-brand-600/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-52 right-0 h-[30rem] w-[30rem] animate-float rounded-full bg-brand-400/25 blur-3xl [animation-delay:-3.5s]" />
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

        <div className="container relative py-16 sm:py-24">
          <div className="mx-auto max-w-3xl animate-fade-up text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/90 shadow-sm backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              {t('home.badge')}
            </span>

            <h1 className="mt-6 text-4xl font-extrabold leading-[1.06] tracking-tight text-white sm:text-5xl lg:text-[4rem]">
              {t('home.titleA')}
              <span className="bg-gradient-to-r from-brand-200 via-brand-300 to-brand-100 bg-clip-text text-transparent"> {t('home.titleB')}</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-gray-300 sm:text-lg">
              {t('home.subtitle')}
            </p>

            {/* Search is the primary action: shoppers arrive knowing what they want */}
            <form action="/products" method="get" className="mx-auto mt-8 flex max-w-xl gap-2 rounded-2xl shadow-[0_24px_48px_-24px_rgba(0,0,0,.65)]">
              <div className="relative flex-1">
                <Icon name="search" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  name="q"
                  placeholder={t('home.searchPlaceholder')}
                  aria-label={t('home.searchAria')}
                  className="h-12 w-full rounded-2xl border border-white/15 bg-white/10 pl-11 pr-4 text-sm text-white outline-none backdrop-blur transition placeholder:text-gray-400 focus:border-brand-400 focus:bg-white/15 focus:ring-4 focus:ring-brand-500/20"
                />
              </div>
              <button className="btn-primary h-12 shrink-0 rounded-2xl px-5">{t('home.search')}</button>
            </form>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-gray-300">
              {[
                ['bolt', t('home.trustInstant')],
                ['shield', t('home.trustProtection')],
                ['lock', t('home.trustEncrypted')],
                ['chat', t('home.trustSupport')],
              ].map(([icon, label]) => (
                <span key={label} className="inline-flex items-center gap-1.5">
                  <Icon name={icon} size={14} className="text-brand-300" /> {label}
                </span>
              ))}
            </div>
          </div>

          {/* Live numbers, straight from the database */}
          <div className="mx-auto mt-12 grid max-w-3xl grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/[.06] shadow-[0_24px_48px_-28px_rgba(0,0,0,.7)] ring-1 ring-white/5 backdrop-blur">
            {heroStats.map((s) => (
              <div key={s.label} className="px-3 py-4 text-center sm:px-6 sm:py-5">
                <p className="text-xl font-extrabold tracking-tight text-white sm:text-[1.7rem]">{s.value}</p>
                <p className="mt-1 text-[11px] text-gray-400 sm:text-xs">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="container space-y-16 sm:space-y-20">
        {/* ── Promotional banners ─────────────────────────────────── */}
        {banners.length > 0 && <BannerCarousel banners={banners as any} />}

        {/* ── Categories ──────────────────────────────────────────── */}
        {categories.length > 0 && (
          <section>
            <div className="mb-6 flex items-end justify-between gap-3">
              <div>
                <p className="section-eyebrow">{t('home.catalog')}</p>
                <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight sm:text-[1.7rem]">{t('home.shopByCategory')}</h2>
              </div>
              <Link href="/products" className="view-all">{t('home.allProducts')} <Icon name="arrow-right" size={14} /></Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
              {categories.map((c, i) => (
                <Link
                  key={c.id}
                  href={`/category/${c.slug}`}
                  className="group relative flex h-40 flex-col justify-end overflow-hidden rounded-3xl p-5 text-white shadow-[0_16px_36px_-18px_rgba(16,24,40,.55)] ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_44px_-18px_rgba(16,24,40,.6)] sm:p-6"
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
                        {c._count.products === 1 ? t('home.productCountOne') : t('home.productCount', { count: c._count.products })}
                      </span>
                    </span>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/20 backdrop-blur transition-all duration-300 group-hover:translate-x-0.5 group-hover:bg-white group-hover:text-gray-900">
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
          <section className="relative overflow-hidden rounded-4xl bg-gray-950 p-5 shadow-[0_28px_56px_-28px_rgba(16,24,40,.65)] ring-1 ring-white/10 sm:p-8">
            <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-red-600/35 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 right-0 h-72 w-72 rounded-full bg-orange-500/25 blur-3xl" />

            <div className="relative mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="inline-flex items-center gap-1.5 rounded-full bg-red-600/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.14em] text-red-300">
                  <Icon name="bolt" size={12} /> {t('home.limitedDeals')}
                </p>
                <h2 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">{flashSale.name}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-gray-400">{t('home.endsIn')}</span>
                <Countdown until={flashSale.endsAt.toISOString()} />
                <Link href="/flash-sale" className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-bold text-gray-900 shadow-md transition hover:bg-gray-100">
                  {t('home.viewAll')} <Icon name="arrow-right" size={14} />
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
                    className="group overflow-hidden rounded-2xl bg-white/[.07] ring-1 ring-white/10 backdrop-blur transition duration-300 hover:-translate-y-1 hover:bg-white/[.12] hover:ring-white/25"
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
                        <div className="absolute inset-0 grid place-items-center bg-gray-950/70 text-xs font-bold uppercase tracking-wider text-white">{t('home.soldOut')}</div>
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
                          <p className="mt-1 text-[10px] font-medium text-gray-400">{t('home.leftAtPrice', { count: left })}</p>
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
            <div className="mb-6 flex items-end justify-between gap-3">
              <div>
                <p className="section-eyebrow">{t('home.handPicked')}</p>
                <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight sm:text-[1.7rem]">{t('home.featured')}</h2>
              </div>
              <Link href="/products" className="view-all">{t('home.viewAll')} <Icon name="arrow-right" size={14} /></Link>
            </div>
            <div className={`grid gap-4 sm:gap-5 ${productCols(Math.min(8, featured.length))}`}>
              {featured.slice(0, 8).map((p) => <ProductCardView key={p.id} product={p} />)}
            </div>
          </section>
        )}

        {/* ── How it works ────────────────────────────────────────── */}
        <section className="rounded-4xl border border-gray-200/80 bg-gradient-to-b from-white to-gray-50/70 p-6 shadow-card sm:p-10">
          <div className="mb-7 text-center">
            <p className="section-eyebrow justify-center">{t('home.howItWorks')}</p>
            <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight sm:text-[1.7rem]">{t('home.threeSteps')}</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {steps(t).map((s, i) => (
              <div key={s.title} className="group relative rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover">
                <span className="absolute right-5 top-4 text-5xl font-extrabold tracking-tight text-gray-100 transition-colors group-hover:text-brand-100">{i + 1}</span>
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-btn-primary">
                  <Icon name={s.icon} size={21} />
                </span>
                <h3 className="relative mt-4 text-[15px] font-bold">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── New arrivals ────────────────────────────────────────── */}
        <section>
          <div className="mb-6 flex items-end justify-between gap-3">
            <div>
              <p className="section-eyebrow">{t('home.justAdded')}</p>
              <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight sm:text-[1.7rem]">{t('home.newArrivals')}</h2>
            </div>
            <Link href="/products?sort=newest" className="view-all">{t('home.viewAll')} <Icon name="arrow-right" size={14} /></Link>
          </div>
          {latest.length > 0 ? (
            <div className={`grid gap-4 sm:gap-5 ${productCols(Math.min(8, latest.length))}`}>
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
            <div className="mb-6 flex items-end justify-between gap-3">
              <div>
                <p className="section-eyebrow">{t('home.socialProof')}</p>
                <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight sm:text-[1.7rem]">{t('home.whatCustomersSay')}</h2>
              </div>
              <Link href="/reviews" className="view-all">{t('home.allReviews')} <Icon name="arrow-right" size={14} /></Link>
            </div>
            <div className={`grid gap-4 sm:gap-5 ${testimonials.length >= 3 ? 'sm:grid-cols-3' : testimonials.length === 2 ? 'sm:grid-cols-2' : ''}`}>
              {testimonials.map((r) => (
                <figure key={r.id} className="card card-hover flex flex-col p-6 transition-all duration-300 hover:-translate-y-1">
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
        <section className="relative overflow-hidden rounded-4xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 px-6 py-12 text-center shadow-glow sm:px-10 sm:py-14">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-white/[.07]" />
          <h2 className="relative text-2xl font-extrabold text-white sm:text-3xl">{t('home.ctaTitle')}</h2>
          <p className="relative mx-auto mt-2 max-w-lg text-sm text-white/85 sm:text-base">
            {t('home.ctaText')}
          </p>
          <div className="relative mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/products" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-brand-700 shadow-lg transition hover:bg-gray-50">
              <Icon name="bag" size={16} /> {t('home.ctaBrowse')}
            </Link>
            {feats.giftcards && (
              <Link href="/gift-cards" className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20">
                <Icon name="gift" size={16} /> {t('home.ctaGift')}
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
