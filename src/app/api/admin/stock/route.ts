import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';

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
export const POST = handler(async (req: NextRequest) => {
  await requireAdmin();
  const b = await req.json();
  const packageId = Number(b.packageId);
  const lines = String(b.lines || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 1000);
  if (!packageId || !lines.length) return jsonError(400, 'packageId and at least one line are required');

  const pkg = await prisma.package.findUnique({ where: { id: packageId } });
  if (!pkg) return jsonError(404, 'Package not found');

  await prisma.stockItem.createMany({ data: lines.map((content) => ({ packageId, content })) });
  const count = await prisma.stockItem.count({ where: { packageId, isSold: false } });
  return NextResponse.json({ ok: true, added: lines.length, available: count });
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
