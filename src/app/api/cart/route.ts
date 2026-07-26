import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';
import { getActiveFlashPrices, effectivePrice } from '@/lib/catalog';
import { parseCustomFields } from '@/lib/utils';

export const dynamic = 'force-dynamic';

async function serializeCart(userId: number) {
  const items = await prisma.cartItem.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      package: {
        include: { product: { include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } } } },
      },
    },
  });
  const flash = await getActiveFlashPrices(items.map((i) => i.packageId));
  // Live stock for auto-delivered packages so sold-out items can't check out.
  const autoIds = items.filter((i) => i.package.autoDeliver).map((i) => i.packageId);
  const stockGroups = autoIds.length
    ? await prisma.stockItem.groupBy({ by: ['packageId'], where: { packageId: { in: autoIds }, isSold: false }, _count: true })
    : [];
  const stockFor = (id: number) => stockGroups.find((g) => g.packageId === id)?._count ?? 0;
  return items.map((item) => {
    const eff = effectivePrice(item.package, flash);
    const stock = item.package.autoDeliver ? stockFor(item.packageId) : item.package.inStock ? null : 0;
    return {
      id: item.id,
      packageId: item.packageId,
      quantity: item.quantity,
      customFieldsData: (item.customFieldsData as Record<string, string>) || {},
      productName: item.package.product.name,
      productSlug: item.package.product.slug,
      packageName: item.package.name,
      image: item.package.product.images[0]?.url || null,
      unitPrice: eff.price,
      originalPrice: eff.original,
      onSale: eff.onSale,
      available: item.package.isActive && item.package.product.isActive && (stock === null || stock >= item.quantity),
      stock,
      outOfStock: stock !== null && stock < item.quantity,
      customFieldDefs: parseCustomFields(item.package.customFields),
    };
  });
}

export const GET = handler(async () => {
  const user = await requireUser();
  return NextResponse.json({ items: await serializeCart(user.id) });
});

// Add an item (or merge quantity when the package is already in the cart).
export const POST = handler(async (req: NextRequest) => {
  const user = await requireUser();
  const body = await req.json();
  const packageId = Number(body.packageId);
  const quantity = Math.min(Math.max(1, Math.floor(Number(body.quantity) || 1)), 100);

  const pkg = await prisma.package.findFirst({
    where: { id: packageId, isActive: true, product: { isActive: true } },
  });
  if (!pkg) return jsonError(404, 'This item is not available');

  if (!pkg.autoDeliver && !pkg.inStock) return jsonError(400, 'This package is out of stock');

  // Auto-delivered packages can only be bought while stock lasts.
  if (pkg.autoDeliver) {
    const [stock, existing] = await Promise.all([
      prisma.stockItem.count({ where: { packageId, isSold: false } }),
      prisma.cartItem.findUnique({ where: { userId_packageId: { userId: user.id, packageId } } }),
    ]);
    const wanted = (existing?.quantity || 0) + quantity;
    if (stock === 0) return jsonError(400, 'This package is out of stock');
    if (wanted > stock) return jsonError(400, `Only ${stock} left in stock`);
  }

  const customFieldsData = body.customFieldsData && typeof body.customFieldsData === 'object' ? body.customFieldsData : undefined;

  await prisma.cartItem.upsert({
    where: { userId_packageId: { userId: user.id, packageId } },
    update: { quantity: { increment: quantity }, ...(customFieldsData ? { customFieldsData } : {}) },
    create: { userId: user.id, packageId, quantity, customFieldsData },
  });
  return NextResponse.json({ ok: true, items: await serializeCart(user.id) });
});

// Update quantity / custom fields, or remove (quantity = 0).
export const PATCH = handler(async (req: NextRequest) => {
  const user = await requireUser();
  const body = await req.json();
  const id = Number(body.id);
  const item = await prisma.cartItem.findFirst({ where: { id, userId: user.id }, include: { package: true } });
  if (!item) return jsonError(404, 'Cart item not found');

  const quantity = Math.floor(Number(body.quantity));
  if (Number.isFinite(quantity) && quantity > 0 && !item.package.autoDeliver && !item.package.inStock) {
    return jsonError(400, 'This package is out of stock');
  }
  if (Number.isFinite(quantity) && quantity > 0 && item.package.autoDeliver) {
    const stock = await prisma.stockItem.count({ where: { packageId: item.packageId, isSold: false } });
    if (quantity > stock) return jsonError(400, stock === 0 ? 'This package is out of stock' : `Only ${stock} left in stock`);
  }
  if (Number.isFinite(quantity) && quantity <= 0) {
    await prisma.cartItem.delete({ where: { id } });
  } else {
    await prisma.cartItem.update({
      where: { id },
      data: {
        ...(Number.isFinite(quantity) ? { quantity: Math.min(quantity, 100) } : {}),
        ...(body.customFieldsData && typeof body.customFieldsData === 'object' ? { customFieldsData: body.customFieldsData } : {}),
      },
    });
  }
  return NextResponse.json({ ok: true, items: await serializeCart(user.id) });
});

export const DELETE = handler(async () => {
  const user = await requireUser();
  await prisma.cartItem.deleteMany({ where: { userId: user.id } });
  return NextResponse.json({ ok: true, items: [] });
});
