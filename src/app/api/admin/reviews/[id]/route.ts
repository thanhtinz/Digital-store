import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { handler } from '@/lib/api';

export const dynamic = 'force-dynamic';

async function refreshProductRating(productId: number) {
  const agg = await prisma.review.aggregate({
    where: { productId, isApproved: true },
    _avg: { rating: true },
    _count: true,
  });
  await prisma.product.update({
    where: { id: productId },
    data: { ratingAvg: Math.round((agg._avg.rating || 0) * 10) / 10, ratingCount: agg._count },
  });
}

export const PATCH = handler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  await requireAdmin();
  const b = await req.json();
  const review = await prisma.review.update({
    where: { id: Number(params.id) },
    data: {
      ...(b.isApproved !== undefined ? { isApproved: !!b.isApproved } : {}),
      ...(b.adminReply !== undefined ? { adminReply: b.adminReply ? String(b.adminReply).slice(0, 2000) : null } : {}),
    },
  });
  await refreshProductRating(review.productId);
  return NextResponse.json({ ok: true, review });
});

export const DELETE = handler(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await requireAdmin();
  const review = await prisma.review.delete({ where: { id: Number(params.id) } });
  await refreshProductRating(review.productId);
  return NextResponse.json({ ok: true });
});
