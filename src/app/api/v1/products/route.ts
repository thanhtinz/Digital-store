import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireApiKey, ApiAuthError } from '@/lib/apiAuth';
import { getActiveFlashPrices, effectivePrice } from '@/lib/catalog';
import { RateLimitError } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

// GET /api/v1/products — catalog with live prices and stock for resellers.
export async function GET(req: NextRequest) {
  try {
    await requireApiKey(req);
    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
      include: {
        category: { select: { name: true, slug: true } },
        packages: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
    const allPkgIds = products.flatMap((p) => p.packages.map((k) => k.id));
    const flash = await getActiveFlashPrices(allPkgIds);
    const autoIds = products.flatMap((p) => p.packages.filter((k) => k.autoDeliver).map((k) => k.id));
    const stockGroups = autoIds.length
      ? await prisma.stockItem.groupBy({ by: ['packageId'], where: { packageId: { in: autoIds }, isSold: false }, _count: true })
      : [];
    const stockFor = (id: number) => stockGroups.find((g) => g.packageId === id)?._count ?? 0;

    return NextResponse.json({
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        category: p.category?.slug || null,
        packages: p.packages.map((k) => {
          const inStock = k.autoDeliver ? stockFor(k.id) > 0 : k.inStock;
          return {
            id: k.id,
            name: k.name,
            price: effectivePrice(k, flash).price,
            delivery: k.autoDeliver ? 'instant' : 'manual',
            in_stock: inStock,
            stock: k.autoDeliver ? stockFor(k.id) : null,
            required_fields: Array.isArray(k.customFields) ? k.customFields : [],
          };
        }),
      })),
    });
  } catch (e: any) {
    if (e instanceof ApiAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof RateLimitError) return NextResponse.json({ error: e.message }, { status: 429 });
    console.error('API v1 error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
