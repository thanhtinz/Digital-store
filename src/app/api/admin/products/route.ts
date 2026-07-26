import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';
import { slugify, parseCustomFields, clampInt } from '@/lib/utils';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export const GET = handler(async (req: NextRequest) => {
  await requireAdmin();
  const q = req.nextUrl.searchParams.get('q')?.trim() || '';
  const page = clampInt(req.nextUrl.searchParams.get('page'), 1, 10_000, 1);
  const where = q ? { name: { contains: q, mode: 'insensitive' as const } } : {};
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { id: 'desc' },
      skip: (page - 1) * 20,
      take: 20,
      include: {
        category: { select: { id: true, name: true } },
        images: { orderBy: { sortOrder: 'asc' } },
        packages: { orderBy: { sortOrder: 'asc' }, include: { _count: { select: { stockItems: { where: { isSold: false } } } } } },
      },
    }),
    prisma.product.count({ where }),
  ]);
  return NextResponse.json({ products, total, page, pageSize: 20 });
});

export const POST = handler(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const b = await req.json();
  const name = String(b.name || '').trim().slice(0, 200);
  if (!name) return jsonError(400, 'Product name is required');
  const slug = slugify(String(b.slug || name));
  if (await prisma.product.findUnique({ where: { slug } })) {
    return jsonError(409, 'A product with this slug already exists');
  }

  const product = await prisma.product.create({
    data: {
      name,
      slug,
      categoryId: b.categoryId ? Number(b.categoryId) : null,
      shortDesc: b.shortDesc ? String(b.shortDesc).slice(0, 500) : null,
      description: b.description ? String(b.description) : null,
      guide: b.guide ? String(b.guide) : null,
      isActive: b.isActive !== false,
      isFeatured: !!b.isFeatured,
      images: {
        create: (Array.isArray(b.images) ? b.images : [])
          .slice(0, 10)
          .map((url: unknown, i: number) => ({ url: String(url), sortOrder: i })),
      },
      packages: {
        create: (Array.isArray(b.packages) ? b.packages : []).slice(0, 30).map((p: any, i: number) => ({
          name: String(p.name || `Package ${i + 1}`).slice(0, 160),
          description: p.description ? String(p.description).slice(0, 500) : null,
          price: Number(p.price) || 0,
          comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
          customFields: parseCustomFields(p.customFields),
          autoDeliver: !!p.autoDeliver,
          sortOrder: i,
          isActive: p.isActive !== false,
        })),
      },
    },
    include: { images: true, packages: true },
  });
  audit(admin, 'product.create', product.name);
  return NextResponse.json({ ok: true, product });
});
