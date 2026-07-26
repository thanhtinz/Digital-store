import { notFound, redirect } from 'next/navigation';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// Category pages reuse the /products listing with the filter pre-applied.
export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const category = await prisma.category.findUnique({ where: { slug: params.slug } });
  if (!category || !category.isActive) notFound();
  redirect(`/products?category=${encodeURIComponent(category.slug)}`);
}
