import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { handler } from '@/lib/api';
import { runAutoCouponRules } from '@/lib/autoCoupons';

export const dynamic = 'force-dynamic';

// Manually evaluate every active rule right now.
export const POST = handler(async () => {
  const admin = await requireAdmin();
  const result = await runAutoCouponRules();
  audit(admin, 'autocoupon.run', undefined, `${result.granted} code(s) granted`);
  return NextResponse.json({ ok: true, granted: result.granted });
});
