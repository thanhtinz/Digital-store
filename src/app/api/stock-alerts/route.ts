import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';
import { rateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

// POST { packageId, email? } — "notify me when back in stock".
// Signed-in users subscribe with their account email; guests provide one.
export const POST = handler(async (req: NextRequest) => {
  rateLimit('stock-alert', 10, 60 * 60);
  const user = await getSessionUser();
  const b = await req.json();
  const packageId = Number(b.packageId);
  const email = (user?.email || String(b.email || '')).trim().toLowerCase();
  if (!packageId) return jsonError(400, 'packageId is required');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonError(400, 'A valid email address is required');

  const pkg = await prisma.package.findUnique({ where: { id: packageId }, select: { autoDeliver: true, isActive: true } });
  if (!pkg || !pkg.isActive || !pkg.autoDeliver) return jsonError(404, 'Package not found');

  const available = await prisma.stockItem.count({ where: { packageId, isSold: false } });
  if (available > 0) return jsonError(400, 'This package is already in stock');

  // Re-subscribing after a restock notification re-arms the alert.
  await prisma.stockAlert.upsert({
    where: { packageId_email: { packageId, email } },
    update: { notifiedAt: null, userId: user?.id ?? null },
    create: { packageId, email, userId: user?.id ?? null },
  });
  return NextResponse.json({ ok: true });
});
