import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { toProductCards, productCardInclude } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

// Card data for the "recently viewed" rail: the client keeps the slug list
// in localStorage and asks for those products in that exact order. Nothing
// is stored server-side and no login is needed.
export async function GET(req: NextRequest) {
  const slugs = (req.nextUrl.searchParams.get('slugs') || '')
    .split(',')
    .map((s) => s.trim().slice(0, 120))
    .filter(Boolean)
    .slice(0, 10);
  if (slugs.length === 0) return NextResponse.json({ products: [] });

  const raw = await prisma.product.findMany({
    where: { slug: { in: slugs }, isActive: true },
    include: productCardInclude,
  });
  const cards = await toProductCards(raw);
  const bySlug = new Map(cards.map((c) => [c.slug, c]));
  const ordered = slugs.map((s) => bySlug.get(s)).filter(Boolean);
  return NextResponse.json({ products: ordered });
}
