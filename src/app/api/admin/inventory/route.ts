import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';

export const dynamic = 'force-dynamic';

// Auto-delivery inventory overview: every package with its stock health.
export const GET = handler(async () => {
  await requireAdmin();
  const packages = await prisma.package.findMany({
    where: { product: { isActive: true } },
    orderBy: [{ productId: 'asc' }, { sortOrder: 'asc' }],
    include: {
      product: { select: { id: true, name: true, slug: true, images: { orderBy: { sortOrder: 'asc' }, take: 1 } } },
    },
  });
  const [unsoldGroups, soldGroups, sold30Groups] = await Promise.all([
    prisma.stockItem.groupBy({ by: ['packageId'], where: { isSold: false }, _count: true }),
    prisma.stockItem.groupBy({ by: ['packageId'], where: { isSold: true }, _count: true }),
    prisma.stockItem.groupBy({
      by: ['packageId'],
      where: { isSold: true, soldAt: { gte: new Date(Date.now() - 30 * 86400_000) } },
      _count: true,
    }),
  ]);
  const count = (groups: { packageId: number; _count: number }[], id: number) =>
    groups.find((g) => g.packageId === id)?._count || 0;

  const rows = packages.map((p) => ({
    packageId: p.id,
    productId: p.product.id,
    productName: p.product.name,
    productImage: p.product.images[0]?.url || null,
    productSlug: p.product.slug,
    packageName: p.name,
    autoDeliver: p.autoDeliver,
    deliveryNote: p.deliveryNote || '',
    lowStockAlert: p.lowStockAlert,
    available: count(unsoldGroups, p.id),
    soldTotal: count(soldGroups, p.id),
    sold30d: count(sold30Groups, p.id),
    isActive: p.isActive,
  }));

  const autoRows = rows.filter((r) => r.autoDeliver);
  return NextResponse.json({
    rows,
    summary: {
      autoPackages: autoRows.length,
      unitsAvailable: autoRows.reduce((s, r) => s + r.available, 0),
      lowStock: autoRows.filter((r) => r.lowStockAlert != null && r.available <= r.lowStockAlert).length,
      outOfStock: autoRows.filter((r) => r.available === 0).length,
      sold30d: autoRows.reduce((s, r) => s + r.sold30d, 0),
    },
  });
});

// PATCH { packageId, autoDeliver?, deliveryNote?, lowStockAlert? }
export const PATCH = handler(async (req: NextRequest) => {
  await requireAdmin();
  const b = await req.json();
  const packageId = Number(b.packageId);
  if (!packageId) return jsonError(400, 'packageId is required');

  await prisma.package.update({
    where: { id: packageId },
    data: {
      ...(b.autoDeliver !== undefined ? { autoDeliver: !!b.autoDeliver } : {}),
      ...(b.deliveryNote !== undefined ? { deliveryNote: String(b.deliveryNote).slice(0, 2000) || null } : {}),
      ...(b.lowStockAlert !== undefined
        ? { lowStockAlert: b.lowStockAlert === null || b.lowStockAlert === '' ? null : Math.max(0, Number(b.lowStockAlert) || 0) }
        : {}),
    },
  });
  return NextResponse.json({ ok: true });
});
