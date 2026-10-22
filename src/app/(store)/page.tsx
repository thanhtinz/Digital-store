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

  const utilityItems = [
    feats.flash_sale && { icon: 'bolt', label: t('nav.flashSale'), href: '/flash-sale' },
    { icon: 'folder', label: t('nav.categories'), href: '/products' },
    { icon: 'bag', label: t('footer.allProducts'), href: '/products' },
    feats.giftcards && { icon: 'gift', label: t('nav.giftCards'), href: '/gift-cards' },
    feats.wallet && { icon: 'credit-card', label: t('nav.wallet'), href: '/wallet' },
    feats.wishlist && { icon: 'heart', label: t('nav.wishlist'), href: '/wishlist' },
    feats.news && { icon: 'news', label: t('nav.news'), href: '/news' },
    feats.support && { icon: 'chat', label: t('nav.support'), href: '/support' },
  ].filter(Boolean).slice(0, 8) as Array<{ icon: string; label: string; href: string }>;

  return (
    <div className="space-y-16 pb-20 sm:space-y-20">
      {/* ── Hero: banner + side panels (Shopee layout in glass) ── */}
      <section className="container pt-5 sm:pt-7">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {banners.length > 0 ? (
              <BannerCarousel banners={banners as any} />
            ) : (
              <div className="card relative flex h-full min-h-56 flex-col justify-center overflow-hidden p-6 sm:p-10">
                <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand-300/40 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-brand-200/50 blur-3xl" />
                <span className="relative inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50/80 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  {t('home.badge')}
                </span>
                <h1 className="relative mt-4 text-3xl font-extrabold leading-[1.08] tracking-tight sm:text-4xl">
                  {t('home.titleA')}
                  <span className="bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent"> {t('home.titleB')}</span>
                </h1>
                <p className="relative mt-3 max-w-lg text-sm leading-relaxed text-gray-500 sm:text-base">{t('home.subtitle')}</p>
                <form action="/products" method="get" className="relative mt-6 flex max-w-lg items-center gap-1 rounded-full bg-white p-1 shadow-glass ring-1 ring-white/70">
                  <Icon name="search" size={17} className="ms-3 shrink-0 text-gray-400" />
                  <input
                    name="q"
                    placeholder={t('home.searchPlaceholder')}
                    aria-label={t('home.searchAria')}
                    className="min-w-0 flex-1 bg-transparent px-1.5 py-2 text-sm outline-none placeholder:text-gray-400"
                  />
                  <button className="btn-primary shrink-0 px-5 py-2">{t('home.search')}</button>
                </form>
                <div className="relative mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-gray-500">
                  {[
                    ['bolt', t('home.trustInstant')],
                    ['shield', t('home.trustProtection')],
                    ['lock', t('home.trustEncrypted')],
                    ['chat', t('home.trustSupport')],
                  ].map(([icon, label]) => (
                    <span key={label} className="inline-flex items-center gap-1.5">
                      <Icon name={icon} size={14} className="text-brand-600" /> {label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Side panels: the live flash sale + the digital-delivery promise */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <Link href="/flash-sale" className="card card-hover group flex flex-col justify-center p-5 transition-all duration-300 hover:-translate-y-0.5">
              <span className="inline-flex items-center gap-1.5 text-sm font-extrabold uppercase tracking-wide text-red-600">
                <Icon name="bolt" size={16} /> {flashSale ? flashSale.name : t('home.dailyDeals')}
              </span>
              {flashSale ? (
                <span className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-gray-500">
                  {t('home.endsIn')} <Countdown until={flashSale.endsAt.toISOString()} />
                </span>
              ) : (
                <span className="mt-2 text-xs leading-relaxed text-gray-500">{t('home.dailyDealsText')}</span>
              )}
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-600 group-hover:underline">
                {t('home.viewAll')} <Icon name="arrow-right" size={13} />
              </span>
            </Link>
            <div className="card flex flex-col justify-center p-5">
              <span className="inline-flex items-center gap-1.5 text-sm font-extrabold uppercase tracking-wide text-emerald-600">
                <Icon name="bolt" size={16} /> {t('home.digitalDelivery')}
              </span>
              <p className="mt-2 text-xs leading-relaxed text-gray-500">{t('home.digitalDeliveryText')}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {heroStats.map((s) => (
                  <div key={s.label} className="rounded-2xl bg-white/60 px-1 py-2 ring-1 ring-white/70">
                    <p className="truncate text-sm font-extrabold text-gray-900">{s.value}</p>
                    <p className="mt-0.5 truncate text-[10px] text-gray-400">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Utility shortcut row */}
        <div className="mt-6 grid grid-cols-4 gap-2 sm:gap-3 lg:grid-cols-8">
          {utilityItems.map((u) => (
            <Link key={`${u.href}-${u.label}`} href={u.href} className="group flex flex-col items-center gap-2 py-1 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full border border-white/60 bg-white/65 text-brand-600 shadow-glass backdrop-blur-xl transition-all duration-300 group-hover:-translate-y-0.5 group-hover:bg-white/90 group-hover:text-brand-700 sm:h-14 sm:w-14">
                <Icon name={u.icon} size={22} />
              </span>
              <span className="text-[11px] font-medium leading-tight text-gray-600 group-hover:text-gray-900 sm:text-xs">{u.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="container space-y-16 sm:space-y-20">

        {/* ── Categories (DANH MỤC glass panel) ─────────────────── */}
        {categories.length > 0 && (
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-white/60 px-5 py-4">
              <h2 className="text-base font-extrabold uppercase tracking-wide text-brand-600">{t('home.categoriesPanel')}</h2>
              <Link href="/products" className="view-all">{t('home.allProducts')} <Icon name="arrow-right" size={14} /></Link>
            </div>
            <div className="grid grid-cols-3 gap-px bg-white/40 sm:grid-cols-4 lg:grid-cols-6">
              {categories.map((c, i) => (
                <Link
                  key={c.id}
                  href={`/category/${c.slug}`}
                  className="group flex flex-col items-center gap-2.5 bg-white/45 px-3 py-5 text-center backdrop-blur transition duration-300 hover:bg-white/75"
                >
                  {c.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.imageUrl} alt="" className="h-14 w-14 rounded-2xl object-cover shadow-sm ring-1 ring-white/70 transition duration-300 group-hover:scale-105" />
                  ) : (
                    <span className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${TILE_TINTS[i % TILE_TINTS.length]} text-xl font-extrabold text-white shadow-sm ring-1 ring-white/50 transition duration-300 group-hover:scale-105`}>
                      {c.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span>
                    <span className="block line-clamp-2 text-xs font-semibold leading-tight text-gray-800 group-hover:text-brand-700">{c.name}</span>
                    <span className="mt-0.5 block text-[10px] text-gray-400">
                      {c._count.products === 1 ? t('home.productCountOne') : t('home.productCount', { count: c._count.products })}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}


        {/* ── Flash sale (light glass, Shopee-style ĐÃ BÁN bars) ── */}
        {flashSale && flashSale.items.length > 0 && (
          <section className="card relative overflow-hidden p-5 sm:p-7">
            <div className="pointer-events-none absolute -left-16 -top-20 h-60 w-60 rounded-full bg-red-400/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 right-0 h-60 w-60 rounded-full bg-brand-300/25 blur-3xl" />

            <div className="relative mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <h2 className="flex items-center gap-1.5 text-xl font-extrabold uppercase tracking-tight text-red-600 sm:text-2xl">
                  <Icon name="bolt" size={20} /> {flashSale.name}
                </h2>
                <span className="flex items-center gap-2 text-xs font-medium text-gray-500">
                  {t('home.endsIn')} <Countdown until={flashSale.endsAt.toISOString()} />
                </span>
              </div>
              <Link href="/flash-sale" className="view-all">{t('home.viewAll')} <Icon name="arrow-right" size={14} /></Link>
            </div>

            <div className={`relative grid gap-3 ${flashCols(Math.min(6, flashSale.items.length))}`}>
              {flashSale.items.slice(0, 6).map((item) => {
                const soldOut = item.quantityLimit != null && item.soldCount >= item.quantityLimit;
                const left = item.quantityLimit != null ? Math.max(0, item.quantityLimit - item.soldCount) : null;
                const pct = Number(item.package.price) > 0
                  ? Math.round((1 - Number(item.salePrice) / Number(item.package.price)) * 100)
                  : 0;
                const soldPct = item.quantityLimit
                  ? Math.min(100, Math.round((item.soldCount / item.quantityLimit) * 100))
                  : 0;
                return (
                  <Link
                    key={item.id}
                    href={`/product/${item.package.product.slug}`}
                    className="group overflow-hidden rounded-3xl border border-white/60 bg-white/70 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-glass"
                  >
                    <div className="relative aspect-square bg-gradient-to-br from-white/60 to-brand-50/50">
                      {item.package.product.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.package.product.images[0].url} alt={item.package.product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="grid h-full place-items-center text-brand-200"><Icon name="bag" size={34} /></div>
                      )}
                      {pct > 0 && (
                        <span className="absolute right-0 top-0 flex flex-col items-center bg-yellow-300 px-1.5 pb-2 pt-1 text-brand-700 shadow-sm [clip-path:polygon(0_0,100%_0,100%_100%,50%_82%,0_100%)]">
                          <span className="text-xs font-extrabold leading-none">-{pct}%</span>
                          <span className="mt-0.5 text-[9px] font-bold uppercase leading-none text-brand-600">{t('catalog.off')}</span>
                        </span>
                      )}
                      {soldOut && (
                        <div className="absolute inset-0 grid place-items-center bg-gray-950/60 text-xs font-bold uppercase tracking-wider text-white">{t('home.soldOut')}</div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-1 text-xs font-semibold text-gray-900">{item.package.product.name}</p>
                      <p className="line-clamp-1 text-[11px] text-gray-400">{item.package.name}</p>
                      <div className="mt-1.5 flex items-baseline gap-1.5">
                        <span className="text-sm font-extrabold text-brand-600">{money(Number(item.salePrice))}</span>
                        <span className="text-[11px] text-gray-400 line-through">{money(Number(item.package.price))}</span>
                      </div>
                      {item.quantityLimit != null && !soldOut ? (
                        <div className="relative mt-2 h-4 overflow-hidden rounded-full bg-brand-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600"
                            style={{ width: `${Math.max(soldPct, 8)}%` }}
                          />
                          <span className="absolute inset-0 grid place-items-center text-[9px] font-extrabold uppercase tracking-wide text-white drop-shadow-[0_1px_1px_rgba(0,0,0,.35)]">
                            {t('home.soldBar', { count: formatNumber(item.soldCount, intlLocale) })}
                          </span>
                        </div>
                      ) : item.soldCount > 0 ? (
                        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                          {t('home.soldBar', { count: formatNumber(item.soldCount, intlLocale) })}
                        </p>
                      ) : null}
                      {left !== null && !soldOut && (
                        <p className="mt-1 text-[10px] font-medium text-gray-400">{t('home.leftAtPrice', { count: left })}</p>
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
            <div className="mb-6">
              <div className="flex items-end justify-between gap-3">
                <h2 className="text-xl font-extrabold uppercase tracking-wide text-brand-600 sm:text-2xl">{t('home.suggested')}</h2>
                <Link href="/products" className="view-all">{t('home.viewAll')} <Icon name="arrow-right" size={14} /></Link>
              </div>
              <div className="mt-3 h-1 rounded-full bg-gradient-to-r from-brand-600 via-brand-400 to-transparent" />
            </div>
            <div className={`grid gap-4 sm:gap-5 ${productCols(Math.min(8, featured.length))}`}>
              {featured.slice(0, 8).map((p) => <ProductCardView key={p.id} product={p} />)}
            </div>
          </section>
        )}

        {/* ── How it works ────────────────────────────────────────── */}
        <section className="rounded-4xl border border-white/60 bg-white/55 p-6 shadow-glass backdrop-blur-xl backdrop-saturate-150 sm:p-10">
          <div className="mb-7 text-center">
            <p className="section-eyebrow justify-center">{t('home.howItWorks')}</p>
            <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight sm:text-[1.7rem]">{t('home.threeSteps')}</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {steps(t).map((s, i) => (
              <div key={s.title} className="group relative rounded-3xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover">
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
