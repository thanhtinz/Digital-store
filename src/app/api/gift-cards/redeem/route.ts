import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';
import { rateLimit } from '@/lib/rateLimit';
import { redeemGiftCard } from '@/lib/giftcards';

export const dynamic = 'force-dynamic';

// POST { code } — redeem a gift card into the wallet.
export const POST = handler(async (req: NextRequest) => {
  const user = await requireUser();
  rateLimit('giftcard-redeem', 10, 60 * 60, String(user.id));
  const code = String((await req.json()).code || '');
  if (!code.trim()) return jsonError(400, 'Enter a gift card code');
  const res = await redeemGiftCard(code, user.id);
  if (!res.ok) return jsonError(400, res.reason);
  return NextResponse.json({ ok: true, amount: res.amount });
});
