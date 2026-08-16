import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';
import { getSettings, setSettings } from '@/lib/settings';
import { validateRatesJson } from '@/lib/currency';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const MASK = '••••••••';
const SECRET_KEYS = new Set([
  'stripe_secret_key', 'stripe_webhook_secret',
  'paypal_client_secret', 'google_client_secret', 'smtp_pass', 'telegram_bot_token', 'customer_bot_token',
  'sepay_webhook_key', 'payos_api_key', 'payos_checksum_key',
]);
const ALL_KEYS = [
  // Site
  'site_name', 'site_tagline', 'site_logo', 'currency', 'support_email', 'footer_text', 'footer_about', 'app_url',
  // Currency and money format
  'currency_decimals', 'currency_symbol', 'currency_symbol_position',
  'currency_thousand_sep', 'currency_decimal_sep', 'currency_rates',
  'currency_round_step', 'payment_currency', 'payment_min',
  'social_facebook', 'social_twitter', 'social_instagram', 'social_youtube', 'social_telegram', 'social_discord',
  'require_email_verification',
  // Stripe
  'stripe_enabled', 'stripe_secret_key', 'stripe_publishable_key', 'stripe_webhook_secret',
  // PayPal
  'paypal_enabled', 'paypal_client_id', 'paypal_client_secret', 'paypal_mode',
  // Vietnamese payment methods
  'payment_ref_base', 'payment_ref_prefix', 'payment_expiry_minutes',
  'bank_transfer_enabled', 'bank_transfer_bank_name', 'bank_transfer_bank_code',
  'bank_transfer_account_number', 'bank_transfer_account_name', 'bank_transfer_instructions',
  'sepay_enabled', 'sepay_webhook_key', 'sepay_bank_name', 'sepay_bank_code',
  'sepay_account_number', 'sepay_account_name', 'sepay_instructions',
  'payos_enabled', 'payos_client_id', 'payos_api_key', 'payos_checksum_key', 'payos_api_base',
  // Google OAuth
  'google_login_enabled', 'google_client_id', 'google_client_secret',
  // SMTP
  'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from',
  // Rewards & affiliate
  'loyalty_enabled', 'loyalty_earn_rate', 'loyalty_redeem_value', 'loyalty_min_redeem',
  'affiliate_enabled', 'affiliate_rate',
  // Telegram notifications
  'telegram_enabled', 'telegram_bot_token', 'telegram_chat_id', 'customer_bot_token',
  // SEO
  'indexnow_key',
  // Appearance
  'theme_color', 'theme_font', 'theme_text_size', 'theme_allow_override',
  // Feature switches
  'feature_wallet', 'feature_giftcards', 'feature_reviews', 'feature_wishlist', 'feature_news', 'feature_flash_sale', 'feature_livechat', 'feature_support',
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

  // Exchange rates are the one setting where a typo silently breaks checkout,
  // so validate and normalize them here rather than at payment time.
  if (updates.currency_rates !== undefined) {
    const base = updates.currency || (await getSettings(['currency'])).currency;
    const check = validateRatesJson(updates.currency_rates, base);
    if (!check.ok) return jsonError(400, check.reason);
    updates.currency_rates = JSON.stringify(check.rates);
  }

  await setSettings(updates);
  const changed = Object.keys(updates);
  if (changed.length) audit(admin, 'settings.update', 'Site settings', `Changed: ${changed.join(', ')}`);
  return NextResponse.json({ ok: true });
});
