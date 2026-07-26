import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { handler, jsonError } from '@/lib/api';
import { slugify } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const PATCH = handler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const admin = await requireAdmin();
  const id = Number(params.id);
  const b = await req.json();
  const category = await prisma.category.update({
    where: { id },
    data: {
      ...(b.name !== undefined ? { name: String(b.name).trim().slice(0, 120) } : {}),
      ...(b.slug !== undefined ? { slug: slugify(String(b.slug)) } : {}),
      ...(b.description !== undefined ? { description: b.description ? String(b.description) : null } : {}),
      ...(b.imageUrl !== undefined ? { imageUrl: b.imageUrl ? String(b.imageUrl) : null } : {}),
      ...(b.sortOrder !== undefined ? { sortOrder: Number(b.sortOrder) || 0 } : {}),
      ...(b.isActive !== undefined ? { isActive: !!b.isActive } : {}),
    },
  });
  audit(admin, 'category.update', category.name);
  return NextResponse.json({ ok: true, category });
});

export const DELETE = handler(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const admin = await requireAdmin();
  const id = Number(params.id);
  const count = await prisma.product.count({ where: { categoryId: id } });
  if (count > 0) return jsonError(400, `Move or delete the ${count} product(s) in this category first`);
  await prisma.category.delete({ where: { id } });
  audit(admin, 'category.delete', `#${params.id}`);
  return NextResponse.json({ ok: true });
});
