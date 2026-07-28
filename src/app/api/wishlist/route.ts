import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  const user = await requireUser();
  const rows = await prisma.wishlistItem.findMany({ where: { userId: user.id }, select: { productId: true } });
  return NextResponse.json({ productIds: rows.map((r) => r.productId) });
});

// Toggle a product in the wishlist.
export const POST = handler(async (req: NextRequest) => {
  const { featureEnabled } = await import('@/lib/features');
  if (!(await featureEnabled('wishlist'))) return jsonError(404, 'Wishlist is not available');
  const user = await requireUser();
  const productId = Number((await req.json()).productId);
  if (!Number.isInteger(productId) || productId <= 0) return jsonError(400, 'A valid productId is required');

  const existing = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId: user.id, productId } },
  });
  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true, inWishlist: false });
  }
  await prisma.wishlistItem.create({ data: { userId: user.id, productId } });
  return NextResponse.json({ ok: true, inWishlist: true });
});
