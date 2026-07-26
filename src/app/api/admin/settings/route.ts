import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';
import { getSettings, setSettings } from '@/lib/settings';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const MASK = '••••••••';
const SECRET_KEYS = new Set([
  'stripe_secret_key', 'stripe_webhook_secret',
  'paypal_client_secret', 'google_client_secret', 'smtp_pass', 'telegram_bot_token',
]);
const ALL_KEYS = [
  // Site
  'site_name', 'site_tagline', 'site_logo', 'currency', 'support_email', 'footer_text', 'footer_about', 'app_url',
  'social_facebook', 'social_twitter', 'social_instagram', 'social_youtube', 'social_telegram', 'social_discord',
  'require_email_verification',
  // Stripe
  'stripe_enabled', 'stripe_secret_key', 'stripe_publishable_key', 'stripe_webhook_secret',
  // PayPal
  'paypal_enabled', 'paypal_client_id', 'paypal_client_secret', 'paypal_mode',
  // Google OAuth
  'google_login_enabled', 'google_client_id', 'google_client_secret',
  // SMTP
  'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from',
  // Rewards & affiliate
  'loyalty_enabled', 'loyalty_earn_rate', 'loyalty_redeem_value', 'loyalty_min_redeem',
  'affiliate_enabled', 'affiliate_rate',
  // Telegram notifications
  'telegram_enabled', 'telegram_bot_token', 'telegram_chat_id',
];

export const GET = handler(async () => {
  await requireAdmin();
  const values = await getSettings(ALL_KEYS);
  const out: Record<string, string> = {};
  for (const key of ALL_KEYS) {
    out[key] = SECRET_KEYS.has(key) ? (values[key] ? MASK : '') : values[key];
  }
  return NextResponse.json({ settings: out });
});

export const POST = handler(async (req: NextRequest) => {
  const admin = await requireAdmin();
  if (admin.role !== 'ADMIN') return jsonError(403, 'Only administrators can change settings');
  const body = await req.json();
  const updates: Record<string, string> = {};
  for (const key of ALL_KEYS) {
    if (body[key] === undefined) continue;
    const value = String(body[key]);
    // Ignore untouched masked secrets so saving the form never wipes them.
    if (SECRET_KEYS.has(key) && (value === MASK || value === '')) continue;
    updates[key] = value;
  }
  await setSettings(updates);
  const changed = Object.keys(updates);
  if (changed.length) audit(admin, 'settings.update', 'Site settings', `Changed: ${changed.join(', ')}`);
  return NextResponse.json({ ok: true });
});
