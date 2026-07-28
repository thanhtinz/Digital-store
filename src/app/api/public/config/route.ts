import { NextResponse } from 'next/server';
import { getPublicSettings } from '@/lib/settings';
import { handler } from '@/lib/api';

export const dynamic = 'force-dynamic';

// Public, cache-safe storefront config (no secrets).
export const GET = handler(async () => {
  const s = await getPublicSettings();
  return NextResponse.json({
    siteName: s.siteName,
    currency: s.currency,
    googleLoginEnabled: s.googleLoginEnabled,
    payments: { stripeEnabled: s.stripeEnabled, paypalEnabled: s.paypalEnabled },
    features: s.features,
  });
});
