import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';
import { checkCoupon } from '@/lib/coupons';

export const dynamic = 'force-dynamic';

export const POST = handler(async (req: NextRequest) => {
  const user = await requireUser();
  const { code, subtotal } = await req.json();
  const check = await checkCoupon(String(code || ''), user.id, Number(subtotal) || 0);
  if (!check.ok) return jsonError(400, check.reason);
  return NextResponse.json({ ok: true, code: check.code, discount: check.discount });
});
