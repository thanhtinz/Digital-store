import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { handler, jsonError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  await requireAdmin();
  const coupons = await prisma.coupon.findMany({ orderBy: { id: 'desc' } });
  return NextResponse.json({ coupons });
});

export const POST = handler(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const b = await req.json();
  const code = String(b.code || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 60);
  if (!code) return jsonError(400, 'Coupon code is required');
  if (await prisma.coupon.findUnique({ where: { code } })) return jsonError(409, 'This coupon code already exists');
  const type = b.type === 'FIXED' ? 'FIXED' : 'PERCENT';
  const value = Number(b.value) || 0;
  if (value <= 0 || (type === 'PERCENT' && value > 100)) return jsonError(400, 'Invalid discount value');

  const coupon = await prisma.coupon.create({
    data: {
      code,
      type,
      value,
      minOrder: b.minOrder ? Number(b.minOrder) : null,
      maxDiscount: b.maxDiscount ? Number(b.maxDiscount) : null,
      maxUses: b.maxUses ? Number(b.maxUses) : null,
      perUserLimit: b.perUserLimit ? Number(b.perUserLimit) : null,
      startsAt: b.startsAt ? new Date(b.startsAt) : null,
      endsAt: b.endsAt ? new Date(b.endsAt) : null,
      isActive: b.isActive !== false,
    },
  });
  audit(admin, 'coupon.create', String((coupon.code) ?? ''));
  return NextResponse.json({ ok: true, coupon });
});
