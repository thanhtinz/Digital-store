import { notFound } from 'next/navigation';
import prisma from '@/lib/db';
import { getActiveFlashPrices, effectivePrice, toProductCards, productCardInclude } from '@/lib/catalog';
import { getAppUrl, getSettings } from '@/lib/settings';
import { parseCustomFields, formatNumber } from '@/lib/utils';
import ProductCardView, { Stars } from '@/components/ProductCardView';
import { TrackRecentView, RecentlyViewedRail } from '@/components/RecentlyViewed';
import Gallery from './Gallery';
import ProductActions from './ProductActions';
import BuyBox from './BuyBox';
import ProductTabs from './ProductTabs';
import Icon from '@/components/icons';
import { getMoneyConfig } from '@/lib/currency';
import { INTL_LOCALE } from '@/i18n';
import { getLocale, getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
    include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
  });
  if (!product) return { title: 'Product' };
  const base = (await getAppUrl()).replace(/\/$/, '');
  const image = product.images[0]?.url;
  return {
    title: product.name,
    description: product.shortDesc || undefined,
    alternates: { canonical: `${base}/product/${product.slug}` },
    openGraph: {
      title: product.name,
      description: product.shortDesc || undefined,
      url: `${base}/product/${product.slug}`,
      type: 'website',
      ...(image ? { images: [image.startsWith('http') ? image : `${base}${image}`] } : {}),
    },
    twitter: { card: 'summary_large_image' },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const intlLocale = INTL_LOCALE[getLocale()];
  const t = getT();
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
    include: {
      category: true,
      images: { orderBy: { sortOrder: 'asc' } },
      packages: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      reviews: {
        where: { isApproved: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { user: { select: { name: true, avatarUrl: true } } },
      },
    },
  });
  if (!product || !product.isActive) notFound();

  const flash = await getActiveFlashPrices(product.packages.map((p) => p.id));
  const autoIds = product.packages.filter((p) => p.autoDeliver).map((p) => p.id);
  const stockGroups = autoIds.length
    ? await prisma.stockItem.groupBy({ by: ['packageId'], where: { packageId: { in: autoIds }, isSold: false }, _count: true })
    : [];
  const stockFor = (id: number) => stockGroups.find((g) => g.packageId === id)?._count ?? 0;
  const packages = product.packages.map((pkg) => {
    const eff = effectivePrice(pkg, flash);
    const flashInfo = flash.get(pkg.id);
    return {
      id: pkg.id,
      name: pkg.name,
      description: pkg.description,
      price: eff.price,
      originalPrice: eff.original,
      comparePrice: pkg.comparePrice ? Number(pkg.comparePrice) : null,
      onSale: eff.onSale,
      saleEndsAt: eff.onSale && flashInfo ? flashInfo.endsAt.toISOString() : null,
      customFields: parseCustomFields(pkg.customFields),
      // null = always available; 0 = sold out (empty pool, or manual package flagged out of stock)
      stock: pkg.autoDeliver ? stockFor(pkg.id) : pkg.inStock ? null : 0,
    };
  });

  const moneyCfg = await getMoneyConfig();
  const { getFeatures } = await import('@/lib/features');
  const feats = await getFeatures();
  const aff = await getSettings(['affiliate_enabled', 'affiliate_rate']);
  const affiliate = {
    enabled: aff.affiliate_enabled === 'true',
    rate: product.affiliateRate !== null ? Number(product.affiliateRate) : Number(aff.affiliate_rate) || 0,
  };

  const relatedRaw = await prisma.product.findMany({
    where: { isActive: true, id: { not: product.id }, categoryId: product.categoryId ?? undefined },
    orderBy: { soldCount: 'desc' },
    take: 4,
    include: productCardInclude,
  });
  const related = await toProductCards(relatedRaw);

  // Product structured data for search engines (rich results).
  const prices = packages.map((p) => p.price);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDesc || undefined,
    image: product.images.map((i) => i.url),
    ...(product.ratingCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.ratingAvg,
            reviewCount: product.ratingCount,
          },
        }
      : {}),
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: moneyCfg.base.code,
      lowPrice: Math.min(...prices, Infinity) === Infinity ? 0 : Math.min(...prices),
      highPrice: Math.max(...prices, 0),
      offerCount: packages.length,
      availability: 'https://schema.org/InStock',
    },
  };

  return (
    <div className="container py-8">
      <TrackRecentView slug={product.slug} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* Breadcrumb */}
      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
        <a href="/" className="hover:text-brand-600">{t('catalog.home')}</a>
        <span>/</span>
        {product.category && (
          <>
            <a href={`/category/${product.category.slug}`} className="hover:text-brand-600">{product.category.name}</a>
            <span>/</span>
          </>
        )}
        <span className="font-medium text-gray-900">{product.name}</span>
      </nav>

      {/* Top block: one panel holding gallery + info — flat white under the
          Shopee style, frosted glass under the Apple-glass style */}
      <div className="surface-block p-5 sm:p-[25px]">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,460px)_1fr]">
          <Gallery images={product.images.map((i) => i.url)} name={product.name} />
          {/* min-w-0: without it the grid item takes its content's min-content
              width, which pushes the whole page wider than a phone viewport. */}
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-3">
              {/* min-w-0 lets a long product name wrap instead of forcing the
                  whole grid wider than a phone viewport. */}
              <h1 className="min-w-0 break-words text-xl font-medium leading-snug text-black/85">
                {product.isFeatured && (
                  <span className="mr-2 inline-block -translate-y-0.5 rounded-[var(--ctl-radius)] bg-brand-600 px-1.5 py-0.5 align-middle text-xs font-medium text-white">
                    {t('catalog.favoritePlus')}
                  </span>
                )}
                {product.name}
              </h1>
              <ProductActions productId={product.id} slug={product.slug} affiliate={affiliate} wishlistEnabled={feats.wishlist} />
            </div>
            {/* Meta row, Shopee-style: underlined orange rating, divided counts */}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <a href="#reviews" className="flex items-center gap-1.5">
                <span className="border-b border-brand-600 font-medium leading-tight text-brand-600">{product.ratingAvg || '—'}</span>
                <Stars value={product.ratingAvg} color="rgb(var(--brand-600))" />
              </a>
              <span className="h-4 w-px bg-gray-300" />
              <a href="#reviews" className="text-black/50 transition hover:text-brand-600">
                <span className="font-medium text-black/80">{formatNumber(product.ratingCount, intlLocale)}</span> {t('product.reviews')}
              </a>
              <span className="h-4 w-px bg-gray-300" />
              <span className="text-black/50">
                <span className="font-medium text-black/80">{formatNumber(product.soldCount, intlLocale)}</span> {t('product.specSold')}
              </span>
            </div>
            {product.shortDesc && <p className="mt-3 text-sm leading-relaxed text-black/55">{product.shortDesc}</p>}
            <BuyBox productId={product.id} packages={packages} />
            {/* Guarantee row, Shopee-style: plain icon + text, no pills */}
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-t border-black/5 pt-4">
              {([
                ['bolt', t('trust.instant')],
                ['shield', t('home.trustProtection')],
                ['chat', t('catalog.support247')],
              ] as const).map(([icon, label]) => (
                <span key={label} className="flex items-center gap-1.5 text-sm text-black/55">
                  <Icon name={icon} size={16} className="text-brand-600" /> {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <ProductTabs
          reviewsEnabled={feats.reviews}
          productId={product.id}
          description={product.description}
          guide={product.guide}
          ratingAvg={product.ratingAvg}
          ratingCount={product.ratingCount}
          categoryName={product.category?.name ?? null}
          categorySlug={product.category?.slug ?? null}
          soldCount={product.soldCount}
          packagesCount={packages.length}
          reviews={product.reviews.map((r) => ({
            id: r.id,
            rating: r.rating,
            content: r.content,
            adminReply: r.adminReply,
            images: Array.isArray(r.images) ? (r.images as string[]) : [],
            userName: r.user.name,
            avatarUrl: r.user.avatarUrl,
            createdAt: r.createdAt.toISOString(),
          }))}
        />
      </div>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold">{t('product.related')}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:[grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
            {related.map((p) => <ProductCardView key={p.id} product={p} />)}
          </div>
        </section>
      )}

      <RecentlyViewedRail excludeSlug={product.slug} className="mt-12" />
    </div>
  );
}
