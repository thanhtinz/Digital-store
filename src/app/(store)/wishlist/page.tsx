import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { featureEnabled } from '@/lib/features';
import { getSessionUser } from '@/lib/auth';
import { toProductCards, productCardInclude } from '@/lib/catalog';
import ProductCardView from '@/components/ProductCardView';
import Icon from '@/components/icons';
import { getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  return { title: getT()('meta.wishlist') };
}

export default async function WishlistPage() {
  const t = getT();
  if (!(await featureEnabled('wishlist'))) notFound();
  const user = await getSessionUser();
  if (!user) redirect('/login?next=/wishlist');

  const rows = await prisma.wishlistItem.findMany({
    where: { userId: user.id },
    orderBy: { id: 'desc' },
    include: { product: { include: productCardInclude } },
  });
  const products = await toProductCards(rows.map((r) => r.product).filter((p) => p.isActive));

  return (
    <div className="container py-8">
      <p className="section-eyebrow">{t('wishlist.eyebrow')}</p>
      <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{t('nav.wishlist')}</h1>
      {products.length === 0 ? (
        <div className="card mt-6 p-16 text-center">
          <Icon name="heart" size={56} className="mx-auto text-gray-300" />
          <p className="mt-4 font-semibold">{t('wishlist.empty')}</p>
          <Link href="/products" className="btn-primary mt-5 inline-flex">{t('cart.browse')}</Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:[grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
          {products.map((p) => <ProductCardView key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
