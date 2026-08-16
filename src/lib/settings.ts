import prisma from './db';
import { moneyFormatFrom, parseRates } from './utils';

// Settings live in the DB (editable from the admin panel). A matching
// environment variable (UPPER_SNAKE_CASE of the key) always wins, so
// operators can pin secrets at deploy time.
const ENV_MAP: Record<string, string> = {
  stripe_secret_key: 'STRIPE_SECRET_KEY',
  stripe_publishable_key: 'STRIPE_PUBLISHABLE_KEY',
  stripe_webhook_secret: 'STRIPE_WEBHOOK_SECRET',
  paypal_client_id: 'PAYPAL_CLIENT_ID',
  paypal_client_secret: 'PAYPAL_CLIENT_SECRET',
  paypal_mode: 'PAYPAL_MODE',
  google_client_id: 'GOOGLE_CLIENT_ID',
  google_client_secret: 'GOOGLE_CLIENT_SECRET',
  smtp_host: 'SMTP_HOST',
  smtp_port: 'SMTP_PORT',
  smtp_user: 'SMTP_USER',
  smtp_pass: 'SMTP_PASS',
  smtp_from: 'SMTP_FROM',
  app_url: 'APP_URL',
};

export const SETTING_DEFAULTS: Record<string, string> = {
  site_name: 'Digital Store',
  site_tagline: 'Instant delivery of premium digital goods',
  site_logo: '',
  // Base currency: every Decimal price in the database is denominated in this.
  currency: 'USD',
  currency_decimals: '2',
  currency_symbol: '',            // blank = derive from the currency code
  currency_symbol_position: 'before',
  currency_thousand_sep: ',',
  currency_decimal_sep: '.',
  currency_rates: '{}',           // { "VND": 25400 } — units of X per 1 base unit
  currency_round_step: '1000',    // round converted zero-decimal amounts up to this
  payment_currency: 'VND',        // what the Vietnamese gateways charge in
  payment_min: '0.50',            // smallest chargeable order total, in base currency
  // Offset for PaymentIntent.ref. Bump it if the database is reset while the
  // PayOS merchant account keeps its history — PayOS rejects a reused orderCode.
  payment_ref_base: '100000',
  payment_ref_prefix: 'DH',       // memo prefix customers type in their transfer
  payment_expiry_minutes: '60',
  // Manual bank transfer (admin confirms the payment)
  bank_transfer_enabled: 'false',
  bank_transfer_bank_name: '',
  bank_transfer_bank_code: '',    // VietQR bank code, e.g. MB, VCB, TCB
  bank_transfer_account_number: '',
  bank_transfer_account_name: '',
  bank_transfer_instructions: '',
  // SePay: bank transfer confirmed automatically by its webhook
  sepay_enabled: 'false',
  sepay_webhook_key: '',
  sepay_bank_name: '',
  sepay_bank_code: '',
  sepay_account_number: '',
  sepay_account_name: '',
  sepay_instructions: '',
  // PayOS: hosted payment link
  payos_enabled: 'false',
  payos_client_id: '',
  payos_api_key: '',
  payos_checksum_key: '',
  payos_api_base: 'https://api-merchant.payos.vn',
  // Appearance
  theme_color: 'indigo',
  theme_font: 'inter',
  theme_text_size: 'normal',
  theme_allow_override: 'true',   // let visitors pick their own
  support_email: 'support@example.com',
  stripe_enabled: 'false',
  paypal_enabled: 'false',
  paypal_mode: 'sandbox',
  google_login_enabled: 'false',
  require_email_verification: 'true',
  footer_text: '',
  footer_about: '',
  social_facebook: '',
  social_twitter: '',
  social_instagram: '',
  social_youtube: '',
  social_telegram: '',
  social_discord: '',
  loyalty_enabled: 'false',
  loyalty_earn_rate: '1',      // points per $1 spent
  loyalty_redeem_value: '0.01', // dollars per point
  loyalty_min_redeem: '100',    // minimum points to redeem
  affiliate_enabled: 'false',
  telegram_enabled: 'false',
  telegram_bot_token: '',
  telegram_chat_id: '',
  customer_bot_token: '',
  indexnow_key: '',
  feature_wallet: 'true',
  feature_giftcards: 'true',
  feature_reviews: 'true',
  feature_wishlist: 'true',
  feature_news: 'true',
  feature_flash_sale: 'true',
  feature_livechat: 'true',
  feature_support: 'true',
  affiliate_rate: '10',         // commission percent
};

// The settings table is small (~70 rows) and now read on nearly every render
// for money formatting, so one full read is cheaper than a query per key.
// A short TTL keeps admin edits feeling immediate; writes bust it outright.
const CACHE_TTL_MS = 5_000;
let cache: { at: number; rows: Record<string, string> } | null = null;

async function loadAll(): Promise<Record<string, string>> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.rows;
  const rows = await prisma.setting.findMany();
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  cache = { at: Date.now(), rows: map };
  return map;
}

export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  const stored = await loadAll();
  const map: Record<string, string> = {};
  for (const key of keys) {
    const env = ENV_MAP[key] ? process.env[ENV_MAP[key]] : undefined;
    map[key] = env || stored[key] || SETTING_DEFAULTS[key] || '';
  }
  return map;
}

export async function getSetting(key: string): Promise<string> {
  return (await getSettings([key]))[key];
}

export async function setSettings(values: Record<string, string>): Promise<void> {
  await Promise.all(
    Object.entries(values).map(([key, value]) =>
      prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } })
    )
  );
  cache = null; // next read reflects the write immediately
}

export async function getAppUrl(): Promise<string> {
  const url = await getSetting('app_url');
  return (url || 'http://localhost:3000').replace(/\/$/, '');
}

// Public, non-secret settings safe to expose to the storefront.
export async function getPublicSettings() {
  const s = await getSettings([
    'site_name', 'site_tagline', 'site_logo', 'currency', 'support_email',
    'currency_decimals', 'currency_symbol', 'currency_symbol_position',
    'currency_thousand_sep', 'currency_decimal_sep', 'currency_rates', 'payment_currency',
    'stripe_enabled', 'paypal_enabled', 'google_login_enabled', 'footer_text',
    'sepay_enabled', 'sepay_account_number', 'payos_enabled', 'payos_client_id',
    'bank_transfer_enabled', 'bank_transfer_account_number',
    'footer_about', 'social_facebook', 'social_twitter', 'social_instagram', 'social_youtube', 'social_telegram', 'social_discord',
    'theme_color', 'theme_font', 'theme_text_size', 'theme_allow_override',
    'feature_wallet', 'feature_giftcards', 'feature_reviews', 'feature_wishlist', 'feature_news', 'feature_flash_sale', 'feature_livechat', 'feature_support',
  ]);
  return {
    siteName: s.site_name,
    tagline: s.site_tagline,
    logo: s.site_logo,
    currency: s.currency,
    // Full money format so the storefront never has to guess the symbol.
    money: moneyFormatFrom(s),
    rates: parseRates(s.currency_rates),
    paymentCurrency: (s.payment_currency || 'VND').toUpperCase(),
    supportEmail: s.support_email,
    theme: { color: s.theme_color, font: s.theme_font, textSize: s.theme_text_size },
    themeAllowOverride: s.theme_allow_override !== 'false',
    stripeEnabled: s.stripe_enabled === 'true',
    sepayEnabled: s.sepay_enabled === 'true' && !!s.sepay_account_number,
    payosEnabled: s.payos_enabled === 'true' && !!s.payos_client_id,
    bankEnabled: s.bank_transfer_enabled === 'true' && !!s.bank_transfer_account_number,
    paypalEnabled: s.paypal_enabled === 'true',
    googleLoginEnabled: s.google_login_enabled === 'true',
    footerText: s.footer_text,
    footerAbout: s.footer_about,
    socials: {
      facebook: s.social_facebook,
      twitter: s.social_twitter,
      instagram: s.social_instagram,
      youtube: s.social_youtube,
      telegram: s.social_telegram,
      discord: s.social_discord,
    },
    features: {
      wallet: s.feature_wallet !== 'false',
      giftcards: s.feature_giftcards !== 'false',
      reviews: s.feature_reviews !== 'false',
      wishlist: s.feature_wishlist !== 'false',
      news: s.feature_news !== 'false',
      flash_sale: s.feature_flash_sale !== 'false',
      livechat: s.feature_livechat !== 'false',
      support: s.feature_support !== 'false',
    },
  };
}
