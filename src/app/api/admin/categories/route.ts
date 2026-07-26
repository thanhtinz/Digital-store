import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';
import { slugify } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  await requireAdmin();
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json({ categories });
});

export const POST = handler(async (req: NextRequest) => {
  await requireAdmin();
  const b = await req.json();
  const name = String(b.name || '').trim().slice(0, 120);
  if (!name) return jsonError(400, 'Name is required');
  const slug = slugify(String(b.slug || name));
  const exists = await prisma.category.findUnique({ where: { slug } });
  if (exists) return jsonError(409, 'A category with this slug already exists');
  const category = await prisma.category.create({
    data: {
      name,
      slug,
      description: b.description ? String(b.description) : null,
      imageUrl: b.imageUrl ? String(b.imageUrl) : null,
      sortOrder: Number(b.sortOrder) || 0,
      isActive: b.isActive !== false,
    },
  });
  return NextResponse.json({ ok: true, category });
});
