import Link from 'next/link';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { toProductCards, productCardInclude } from '@/lib/catalog';
import ProductCardView from '@/components/ProductCardView';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Wishlist' };

export default async function WishlistPage() {
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
      <h1 className="text-2xl font-bold">Wishlist</h1>
      {products.length === 0 ? (
        <div className="card mt-6 p-16 text-center">
          <p className="text-5xl">❤️</p>
          <p className="mt-4 font-semibold">Your wishlist is empty</p>
          <Link href="/products" className="btn-primary mt-5 inline-flex">Browse products</Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => <ProductCardView key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
