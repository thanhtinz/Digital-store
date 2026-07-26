import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  await requireAdmin();
  const banners = await prisma.banner.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] });
  return NextResponse.json({ banners });
});

export const POST = handler(async (req: NextRequest) => {
  await requireAdmin();
  const b = await req.json();
  if (!b.imageUrl) return jsonError(400, 'Banner image is required');
  const banner = await prisma.banner.create({
    data: {
      title: b.title ? String(b.title).slice(0, 160) : null,
      subtitle: b.subtitle ? String(b.subtitle).slice(0, 300) : null,
      imageUrl: String(b.imageUrl),
      linkUrl: b.linkUrl ? String(b.linkUrl) : null,
      sortOrder: Number(b.sortOrder) || 0,
      isActive: b.isActive !== false,
    },
  });
  return NextResponse.json({ ok: true, banner });
});
