import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { toProductCards, productCardInclude } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

// Lightweight autocomplete for the header search: up to 7 active products
// whose name matches the query, best sellers first. Prices are the card's
// effective min prices so the dropdown matches the listing pages.
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ products: [] });

  const raw = await prisma.product.findMany({
    where: { isActive: true, name: { contains: q, mode: 'insensitive' } },
    orderBy: [{ soldCount: 'desc' }, { id: 'desc' }],
    take: 7,
    include: productCardInclude,
  });
  const cards = await toProductCards(raw);
  return NextResponse.json({
    products: cards.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      image: c.image,
      minPrice: c.minPrice,
      minOriginal: c.minOriginal,
      onSale: c.onSale,
    })),
  });
}
