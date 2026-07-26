import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';
import { audit } from '@/lib/audit';
import { notifyRestock } from '@/lib/stockAlerts';

export const dynamic = 'force-dynamic';

// GET ?packageId= — list unsold stock for a package.
export const GET = handler(async (req: NextRequest) => {
  await requireAdmin();
  const packageId = Number(req.nextUrl.searchParams.get('packageId'));
  if (!packageId) return jsonError(400, 'packageId is required');
  const [unsold, sold] = await Promise.all([
    prisma.stockItem.findMany({ where: { packageId, isSold: false }, orderBy: { id: 'asc' }, take: 500 }),
    prisma.stockItem.count({ where: { packageId, isSold: true } }),
  ]);
  return NextResponse.json({ items: unsold, soldCount: sold });
});

// POST { packageId, lines: "one item per line" } — bulk add stock.
// Lines already present in the package's pool (sold or unsold) are skipped,
// so re-pasting a supplier file never creates duplicate deliverables.
export const POST = handler(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const b = await req.json();
  const packageId = Number(b.packageId);
  const lines = Array.from(new Set(
    String(b.lines || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
  )).slice(0, 1000);
  if (!packageId || !lines.length) return jsonError(400, 'packageId and at least one line are required');

  const pkg = await prisma.package.findUnique({ where: { id: packageId } });
  if (!pkg) return jsonError(404, 'Package not found');

  const existing = await prisma.stockItem.findMany({
    where: { packageId, content: { in: lines } },
    select: { content: true },
  });
  const existingSet = new Set(existing.map((e) => e.content));
  const fresh = lines.filter((l) => !existingSet.has(l));

  if (fresh.length) {
    await prisma.stockItem.createMany({ data: fresh.map((content) => ({ packageId, content })) });
    // Tell customers waiting on this package that it is available again.
    notifyRestock(packageId).catch((e) => console.error('[stock-alerts] notify failed:', e));
  }
  if (fresh.length) audit(admin, 'stock.import', pkg.name, `${fresh.length} item(s) added`);
  const count = await prisma.stockItem.count({ where: { packageId, isSold: false } });
  return NextResponse.json({
    ok: true,
    added: fresh.length,
    skippedDuplicates: lines.length - fresh.length,
    available: count,
  });
});

// DELETE { id } — remove an unsold stock item.
export const DELETE = handler(async (req: NextRequest) => {
  await requireAdmin();
  const id = Number((await req.json()).id);
  const item = await prisma.stockItem.findUnique({ where: { id } });
  if (!item || item.isSold) return jsonError(400, 'Only unsold stock can be removed');
  await prisma.stockItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
