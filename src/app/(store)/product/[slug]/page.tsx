import { notFound } from 'next/navigation';
import prisma from '@/lib/db';
import { getActiveFlashPrices, effectivePrice, toProductCards, productCardInclude } from '@/lib/catalog';
import { parseCustomFields } from '@/lib/utils';
import ProductCardView, { Stars } from '@/components/ProductCardView';
import Gallery from './Gallery';
import BuyBox from './BuyBox';
import ProductTabs from './ProductTabs';
import Icon from '@/components/icons';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const product = await prisma.product.findUnique({ where: { slug: params.slug } });
  return { title: product?.name || 'Product', description: product?.shortDesc || undefined };
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
    };
  });

  const relatedRaw = await prisma.product.findMany({
    where: { isActive: true, id: { not: product.id }, categoryId: product.categoryId ?? undefined },
    orderBy: { soldCount: 'desc' },
    take: 4,
    include: productCardInclude,
  });
  const related = await toProductCards(relatedRaw);

  return (
    <div className="container py-8">
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
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{product.name}</h1>
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
            userName: r.user.name,
            avatarUrl: r.user.avatarUrl,
            createdAt: r.createdAt.toISOString(),
          }))}
        />
      </div>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold">Related products</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:[grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
            {related.map((p) => <ProductCardView key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
