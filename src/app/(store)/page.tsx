import Link from 'next/link';
import prisma from '@/lib/db';
import { toProductCards, productCardInclude } from '@/lib/catalog';
import { getFeatures } from '@/lib/features';
import BannerCarousel from '@/components/BannerCarousel';
import Countdown from '@/components/Countdown';
import SuggestedTabs from '@/components/SuggestedTabs';
import VoucherStrip from '@/components/VoucherStrip';
import { type Voucher } from '@/lib/voucher';

import Icon from '@/components/icons';
import { getMoneyFormatter } from '@/lib/currency';
import { getT } from '@/i18n/server';
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

export default async function HomePage() {
  const intlLocale = INTL_LOCALE[getLocale()];
  const t = getT();
  const money = await getMoneyFormatter();
  const now = new Date();
  const feats = await getFeatures();
  const [banners, categories, flashSale, coupons, pool, stats] = await Promise.all([
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
    prisma.coupon.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      // Newest first: the homepage strip headlines the freshest codes.
      orderBy: { id: 'desc' },
      take: 20,
    }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { id: 'desc' },
      take: 48,
      include: productCardInclude,
    }),
    Promise.all([
      prisma.product.count({ where: { isActive: true } }),
      prisma.order.count({ where: { status: { in: ['PAID', 'COMPLETED'] } } }),
      prisma.review.aggregate({ where: { isApproved: true }, _avg: { rating: true }, _count: true }),
    ]),
  ]);

  const [productCount, orderCount, ratingAgg] = stats;
  const avgRating = Math.round((ratingAgg._avg.rating || 0) * 10) / 10;

  // One pool of cards feeds all four "GỢI Ý HÔM NAY" sort tabs.
  const cards = await toProductCards(pool);
  const suggestedRelated = [...cards]
    .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || b.soldCount - a.soldCount || b.id - a.id)
    .slice(0, 12);
  const suggestedNewest = cards.slice(0, 12);
  const suggestedBest = [...cards].sort((a, b) => b.soldCount - a.soldCount || b.id - a.id).slice(0, 12);
  const suggestedPrice = [...cards]
    .sort((a, b) => a.minPrice - b.minPrice || b.soldCount - a.soldCount)
    .slice(0, 12);

  const vouchers: Voucher[] = coupons.map((c) => ({
    code: c.code,
    type: c.type as Voucher['type'],
    value: Number(c.value),
    minOrder: c.minOrder != null ? Number(c.minOrder) : null,
    maxDiscount: c.maxDiscount != null ? Number(c.maxDiscount) : null,
    endsAt: c.endsAt ? c.endsAt.toISOString() : null,
  }));

  const heroStats = [
    { value: formatNumber(productCount, intlLocale), label: t('home.statProducts') },
    { value: orderCount > 0 ? `${formatNumber(orderCount, intlLocale)}+` : 'Instant', label: orderCount > 0 ? t('home.statOrders') : t('home.statAutomated') },
    { value: avgRating > 0 ? `${avgRating}/5` : '24/7', label: avgRating > 0 ? t('home.statReviews', { count: ratingAgg._count }) : t('home.statHuman') },
  ];

  const guarantees = [
    { icon: 'bolt', title: t('home.trustInstant'), text: t('home.trustInstantText') },
    { icon: 'shield', title: t('home.trustProtection'), text: t('home.trustProtectionText') },
    { icon: 'lock', title: t('home.trustEncrypted'), text: t('home.trustEncryptedText') },
    { icon: 'chat', title: t('home.trustSupport'), text: t('home.trustSupportText') },
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
      {/* ── Hero: full-width banner carousel. Flash Sale and Voucher have
          their own dedicated sections further down the page, so there are
          no side panels here — nothing appears twice. ── */}
      <section className="container pt-5 sm:pt-7">
        {banners.length > 0 ? (
          <BannerCarousel banners={banners as any} />
        ) : (
          <div className="card relative flex min-h-56 flex-col justify-center overflow-hidden p-6 sm:p-10">
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
              {guarantees.map((g) => (
                <span key={g.title} className="inline-flex items-center gap-1.5">
                  <Icon name={g.icon} size={14} className="text-brand-600" /> {g.title}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Utility shortcut row (8 items) */}
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

        {/* ── Voucher strip (newest 5 + "view more" toggle live in the
            VoucherStrip client component) ─────────────────────────── */}
        {vouchers.length > 0 && <VoucherStrip vouchers={vouchers} />}

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

            {/* Shopee-style rail: one horizontal, snap-scrolling row with
                the scrollbar hidden, instead of a static grid. */}
            <div className="relative -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden px-1 pb-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {flashSale.items.map((item) => {
                const soldOut = item.quantityLimit != null && item.soldCount >= item.quantityLimit;
                const left = item.quantityLimit != null ? Math.max(0, item.quantityLimit - item.soldCount) : null;
                const pct = Number(item.package.price) > 0
                  ? Math.round((1 - Number(item.salePrice) / Number(item.package.price)) * 100)
                  : 0;
                const soldPct = item.quantityLimit
                  ? Math.min(100, Math.round((item.soldCount / item.quantityLimit) * 100))
                  : 0;
                // Fire state: nearly sold out — hotter bar + flame label.
                const hot = !soldOut && item.quantityLimit != null && soldPct >= 85;
                return (
                  <Link
                    key={item.id}
                    href={`/product/${item.package.product.slug}`}
                    className="group w-40 shrink-0 snap-start overflow-hidden rounded-3xl border border-white/60 bg-white/70 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-glass sm:w-44 lg:w-48"
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
                        <div className={`relative mt-2 h-4 overflow-hidden rounded-full ${hot ? 'bg-red-100' : 'bg-brand-100'}`}>
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${hot ? 'from-red-500 via-orange-500 to-amber-500' : 'from-brand-500 to-brand-600'}`}
                            style={{ width: `${Math.max(soldPct, 8)}%` }}
                          />
                          <span className="absolute inset-0 flex items-center justify-center gap-1 text-[9px] font-extrabold uppercase tracking-wide text-white drop-shadow-[0_1px_1px_rgba(0,0,0,.35)]">
                            {hot && <Icon name="flame" size={10} />}
                            {hot
                              ? t('home.almostGone')
                              : t('home.soldBar', { count: formatNumber(item.soldCount, intlLocale) })}
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

        {/* ── GỢI Ý HÔM NAY with sort tabs ──────────────────────── */}
        <section>
          <div className="mb-2">
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-xl font-extrabold uppercase tracking-wide text-brand-600 sm:text-2xl">{t('home.suggested')}</h2>
              <Link href="/products" className="view-all">{t('home.viewAll')} <Icon name="arrow-right" size={14} /></Link>
            </div>
            <div className="mt-3 h-1 rounded-full bg-gradient-to-r from-brand-600 via-brand-400 to-transparent" />
          </div>
          <SuggestedTabs
            related={suggestedRelated}
            newest={suggestedNewest}
            best={suggestedBest}
            price={suggestedPrice}
          />
        </section>

        {/* ── Trust / guarantee band ────────────────────────────── */}
        <section className="card p-6 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="section-eyebrow">{t('home.digitalDelivery')}</p>
              <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight sm:text-[1.7rem]">{t('home.guaranteeTitle')}</h2>
            </div>
            <div className="flex gap-6">
              {heroStats.map((s) => (
                <div key={s.label} className="text-end">
                  <p className="text-xl font-extrabold text-brand-700">{s.value}</p>
                  <p className="text-[11px] font-medium text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {guarantees.map((g) => (
              <div key={g.title} className="flex gap-3.5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-btn-primary">
                  <Icon name={g.icon} size={19} />
                </span>
                <span>
                  <span className="block text-sm font-bold text-gray-900">{g.title}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-gray-500">{g.text}</span>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
