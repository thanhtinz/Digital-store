import prisma from './db';

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
  currency: 'USD',
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

export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
  const map: Record<string, string> = {};
  for (const key of keys) {
    const env = ENV_MAP[key] ? process.env[ENV_MAP[key]] : undefined;
    const row = rows.find((r) => r.key === key);
    map[key] = env || row?.value || SETTING_DEFAULTS[key] || '';
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
}

export async function getAppUrl(): Promise<string> {
  const url = await getSetting('app_url');
  return (url || 'http://localhost:3000').replace(/\/$/, '');
}

// Public, non-secret settings safe to expose to the storefront.
export async function getPublicSettings() {
  const s = await getSettings([
    'site_name', 'site_tagline', 'site_logo', 'currency', 'support_email',
    'stripe_enabled', 'paypal_enabled', 'google_login_enabled', 'footer_text',
    'footer_about', 'social_facebook', 'social_twitter', 'social_instagram', 'social_youtube', 'social_telegram', 'social_discord',
    'feature_wallet', 'feature_giftcards', 'feature_reviews', 'feature_wishlist', 'feature_news', 'feature_flash_sale', 'feature_livechat', 'feature_support',
  ]);
  return {
    siteName: s.site_name,
    tagline: s.site_tagline,
    logo: s.site_logo,
    currency: s.currency,
    supportEmail: s.support_email,
    stripeEnabled: s.stripe_enabled === 'true',
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
