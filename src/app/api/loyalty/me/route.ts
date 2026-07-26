import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { handler } from '@/lib/api';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

// Loyalty status for the checkout page.
export const GET = handler(async () => {
  const user = await requireUser();
  const s = await getSettings(['loyalty_enabled', 'loyalty_earn_rate', 'loyalty_redeem_value', 'loyalty_min_redeem']);
  return NextResponse.json({
    enabled: s.loyalty_enabled === 'true',
    points: user.loyaltyPoints,
    earnRate: Number(s.loyalty_earn_rate) || 0,
    redeemValue: Number(s.loyalty_redeem_value) || 0,
    minRedeem: Number(s.loyalty_min_redeem) || 0,
  });
});
