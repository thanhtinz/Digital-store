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
  return items.map((item) => {
    const eff = effectivePrice(item.package, flash);
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
      available: item.package.isActive && item.package.product.isActive,
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
  const item = await prisma.cartItem.findFirst({ where: { id, userId: user.id } });
  if (!item) return jsonError(404, 'Cart item not found');

  const quantity = Math.floor(Number(body.quantity));
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
