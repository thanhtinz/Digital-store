import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey, ApiAuthError } from '@/lib/apiAuth';
import { RateLimitError } from '@/lib/rateLimit';
import { getMoneyConfig } from '@/lib/currency';

export const dynamic = 'force-dynamic';

// GET /api/v1/balance — the key owner's wallet balance.
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireApiKey(req);
    return NextResponse.json({ balance: Number(user.balance), currency: (await getMoneyConfig()).base.code });
  } catch (e: any) {
    if (e instanceof ApiAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof RateLimitError) return NextResponse.json({ error: e.message }, { status: 429 });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
