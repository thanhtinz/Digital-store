import { notFound } from 'next/navigation';
import prisma from '@/lib/db';
import { getActiveFlashPrices, effectivePrice, toProductCards, productCardInclude } from '@/lib/catalog';
import { getAppUrl } from '@/lib/settings';
import { parseCustomFields } from '@/lib/utils';
import ProductCardView, { Stars } from '@/components/ProductCardView';
import Gallery from './Gallery';
import ProductActions from './ProductActions';
import BuyBox from './BuyBox';
import ProductTabs from './ProductTabs';
import Icon from '@/components/icons';

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
      priceCurrency: 'USD',
      lowPrice: Math.min(...prices, Infinity) === Infinity ? 0 : Math.min(...prices),
      highPrice: Math.max(...prices, 0),
      offerCount: packages.length,
      availability: 'https://schema.org/InStock',
    },
  };

  return (
    <div className="container py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* Breadcrumb */}
      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
        <a href="/" className="hover:text-brand-600">Home</a>
        <span>/</span>
        {product.category && (
          <>
            <a href={`/category/${product.category.slug}`} className="hover:text-brand-600">{product.category.name}</a>
            <span>/</span>
          </>
        )}
        <span className="font-medium text-gray-900">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <Gallery images={product.images.map((i) => i.url)} name={product.name} />
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-bold sm:text-3xl">{product.name}</h1>
            <ProductActions productId={product.id} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <Stars value={product.ratingAvg} />
              <b className="text-gray-800">{product.ratingAvg || '—'}</b>
              ({product.ratingCount} review{product.ratingCount === 1 ? '' : 's'})
            </span>
            <span>·</span>
            <span>{product.soldCount.toLocaleString('en-US')} sold</span>
          </div>
          {product.shortDesc && <p className="mt-3 text-sm leading-relaxed text-gray-600">{product.shortDesc}</p>}
          <div className="mt-5">
            <BuyBox productId={product.id} packages={packages} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {([
              ['bolt', 'Instant delivery'],
              ['shield', 'Buyer protection'],
              ['chat', '24/7 support'],
            ] as const).map(([icon, label]) => (
              <div key={label} className="flex items-center justify-center gap-1.5 rounded-lg bg-gray-50 px-2 py-2.5 text-xs font-medium text-gray-600">
                <Icon name={icon} size={14} className="text-brand-600" /> {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10">
        <ProductTabs
          productId={product.id}
          description={product.description}
          guide={product.guide}
          ratingAvg={product.ratingAvg}
          ratingCount={product.ratingCount}
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
          <h2 className="mb-4 text-xl font-bold">Related products</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:[grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
            {related.map((p) => <ProductCardView key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
