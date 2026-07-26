import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { handler } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const PATCH = handler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const admin = await requireAdmin();
  const b = await req.json();
  const banner = await prisma.banner.update({
    where: { id: Number(params.id) },
    data: {
      ...(b.title !== undefined ? { title: b.title ? String(b.title).slice(0, 160) : null } : {}),
      ...(b.subtitle !== undefined ? { subtitle: b.subtitle ? String(b.subtitle).slice(0, 300) : null } : {}),
      ...(b.imageUrl !== undefined ? { imageUrl: String(b.imageUrl) } : {}),
      ...(b.linkUrl !== undefined ? { linkUrl: b.linkUrl ? String(b.linkUrl) : null } : {}),
      ...(b.sortOrder !== undefined ? { sortOrder: Number(b.sortOrder) || 0 } : {}),
      ...(b.isActive !== undefined ? { isActive: !!b.isActive } : {}),
    },
  });
  audit(admin, 'banner.update', banner.title || `#${banner.id}`);
  return NextResponse.json({ ok: true, banner });
});

export const DELETE = handler(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const admin = await requireAdmin();
  await prisma.banner.delete({ where: { id: Number(params.id) } });
  audit(admin, 'banner.delete', `#${params.id}`);
  return NextResponse.json({ ok: true });
});
