import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { handler } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const PATCH = handler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const admin = await requireAdmin();
  const b = await req.json();
  const coupon = await prisma.coupon.update({
    where: { id: Number(params.id) },
    data: {
      ...(b.value !== undefined ? { value: Number(b.value) || 0 } : {}),
      ...(b.type !== undefined ? { type: b.type === 'FIXED' ? 'FIXED' : 'PERCENT' } : {}),
      ...(b.minOrder !== undefined ? { minOrder: b.minOrder ? Number(b.minOrder) : null } : {}),
      ...(b.maxDiscount !== undefined ? { maxDiscount: b.maxDiscount ? Number(b.maxDiscount) : null } : {}),
      ...(b.maxUses !== undefined ? { maxUses: b.maxUses ? Number(b.maxUses) : null } : {}),
      ...(b.perUserLimit !== undefined ? { perUserLimit: b.perUserLimit ? Number(b.perUserLimit) : null } : {}),
      ...(b.startsAt !== undefined ? { startsAt: b.startsAt ? new Date(b.startsAt) : null } : {}),
      ...(b.endsAt !== undefined ? { endsAt: b.endsAt ? new Date(b.endsAt) : null } : {}),
      ...(b.isActive !== undefined ? { isActive: !!b.isActive } : {}),
    },
  });
  audit(admin, 'coupon.update', coupon.code);
  return NextResponse.json({ ok: true, coupon });
});

export const DELETE = handler(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const admin = await requireAdmin();
  await prisma.coupon.delete({ where: { id: Number(params.id) } });
  audit(admin, 'coupon.delete', `#${params.id}`);
  return NextResponse.json({ ok: true });
});
