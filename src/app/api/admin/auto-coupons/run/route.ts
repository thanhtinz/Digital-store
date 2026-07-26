import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { handler } from '@/lib/api';
import { runAutoCouponRules } from '@/lib/autoCoupons';

export const dynamic = 'force-dynamic';

// Manually evaluate every active rule right now.
export const POST = handler(async () => {
  await requireAdmin();
  const result = await runAutoCouponRules();
  return NextResponse.json({ ok: true, granted: result.granted });
});
