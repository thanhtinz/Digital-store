import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';
import { rateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

// Only media served by our own /api/media endpoint may be attached (max 3).
function cleanImages(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((u) => String(u))
    .filter((u) => /^\/api\/media\/\d+$/.test(u))
    .slice(0, 3);
}

// Post (or update) a review. Only buyers with a paid order containing the
// product may review it — "verified purchase" reviews only.
export const POST = handler(async (req: NextRequest) => {
  const user = await requireUser();
  rateLimit('review-post', 10, 60 * 60, String(user.id));
  const body = await req.json();
  const productId = Number(body.productId);
  const images = body.images !== undefined ? cleanImages(body.images) : undefined;
  const rating = Math.min(5, Math.max(1, Math.floor(Number(body.rating) || 0)));
  const content = String(body.content || '').trim().slice(0, 2000);
  if (!productId || !rating) return jsonError(400, 'Rating is required');

  const purchased = await prisma.orderItem.findFirst({
    where: {
      order: { userId: user.id, status: { in: ['PAID', 'COMPLETED'] } },
      package: { productId },
    },
  });
  if (!purchased) return jsonError(403, 'Only customers who purchased this product can review it');

  await prisma.review.upsert({
    where: { productId_userId: { productId, userId: user.id } },
    update: { rating, content: content || null, ...(images !== undefined ? { images } : {}) },
    create: { productId, userId: user.id, rating, content: content || null, images: images ?? [] },
  });

  // Refresh aggregate rating.
  const agg = await prisma.review.aggregate({
    where: { productId, isApproved: true },
    _avg: { rating: true },
    _count: true,
  });
  await prisma.product.update({
    where: { id: productId },
    data: { ratingAvg: Math.round((agg._avg.rating || 0) * 10) / 10, ratingCount: agg._count },
  });

  return NextResponse.json({ ok: true });
});
