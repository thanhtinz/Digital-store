import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';
import { slugify, parseCustomFields } from '@/lib/utils';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export const GET = handler(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await requireAdmin();
  const product = await prisma.product.findUnique({
    where: { id: Number(params.id) },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      packages: { orderBy: { sortOrder: 'asc' }, include: { _count: { select: { stockItems: { where: { isSold: false } } } } } },
    },
  });
  if (!product) return jsonError(404, 'Product not found');
  return NextResponse.json({ product });
});

// Full update: scalar fields + replace images + upsert packages.
// Packages referenced by past orders are never hard-deleted; missing ones
// are deactivated instead.
export const PATCH = handler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const admin = await requireAdmin();
  const id = Number(params.id);
  const b = await req.json();
  const existing = await prisma.product.findUnique({ where: { id }, include: { packages: true } });
  if (!existing) return jsonError(404, 'Product not found');

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        ...(b.name !== undefined ? { name: String(b.name).trim().slice(0, 200) } : {}),
        ...(b.slug !== undefined ? { slug: slugify(String(b.slug)) } : {}),
        ...(b.categoryId !== undefined ? { categoryId: b.categoryId ? Number(b.categoryId) : null } : {}),
        ...(b.shortDesc !== undefined ? { shortDesc: b.shortDesc ? String(b.shortDesc).slice(0, 500) : null } : {}),
        ...(b.description !== undefined ? { description: b.description ? String(b.description) : null } : {}),
        ...(b.guide !== undefined ? { guide: b.guide ? String(b.guide) : null } : {}),
        ...(b.isActive !== undefined ? { isActive: !!b.isActive } : {}),
        ...(b.isFeatured !== undefined ? { isFeatured: !!b.isFeatured } : {}),
      },
    });

    if (Array.isArray(b.images)) {
      await tx.productImage.deleteMany({ where: { productId: id } });
      await tx.productImage.createMany({
        data: b.images.slice(0, 10).map((url: unknown, i: number) => ({ productId: id, url: String(url), sortOrder: i })),
      });
    }

    if (Array.isArray(b.packages)) {
      const keptIds: number[] = [];
      for (const [i, p] of b.packages.slice(0, 30).entries()) {
        const data = {
          name: String(p.name || `Package ${i + 1}`).slice(0, 160),
          description: p.description ? String(p.description).slice(0, 500) : null,
          price: Number(p.price) || 0,
          comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
          customFields: parseCustomFields(p.customFields),
          autoDeliver: !!p.autoDeliver,
          sortOrder: i,
          isActive: p.isActive !== false,
        };
        if (p.id && existing.packages.some((ep) => ep.id === Number(p.id))) {
          await tx.package.update({ where: { id: Number(p.id) }, data });
          keptIds.push(Number(p.id));
        } else {
          const created = await tx.package.create({ data: { ...data, productId: id } });
          keptIds.push(created.id);
        }
      }
      // Deactivate packages removed in the editor (safe for order history).
      await tx.package.updateMany({
        where: { productId: id, id: { notIn: keptIds } },
        data: { isActive: false },
      });
    }
  });

  const product = await prisma.product.findUnique({
    where: { id },
    include: { images: { orderBy: { sortOrder: 'asc' } }, packages: { orderBy: { sortOrder: 'asc' } } },
  });
  audit(admin, 'product.update', existing.name);
  return NextResponse.json({ ok: true, product });
});

export const DELETE = handler(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const admin = await requireAdmin();
  const id = Number(params.id);
  const target = await prisma.product.findUnique({ where: { id }, select: { name: true } });
  const orderCount = await prisma.orderItem.count({ where: { package: { productId: id } } });
  if (orderCount > 0) {
    // Keep order history intact — deactivate instead of destroying.
    await prisma.product.update({ where: { id }, data: { isActive: false } });
    audit(admin, 'product.deactivate', target?.name);
    return NextResponse.json({ ok: true, deactivated: true });
  }
  await prisma.product.delete({ where: { id } });
  audit(admin, 'product.delete', target?.name);
  return NextResponse.json({ ok: true });
});
