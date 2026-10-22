// Shared helpers usable on both server and client. Nothing here may import
// the database or settings — the money format is always passed in.

// How the store renders amounts. Built from the currency_* settings.
export type MoneyFormat = {
  code: string;
  symbol: string;
  position: 'before' | 'after';
  decimals: number;
  thousandSep: string;
  decimalSep: string;
};

const SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', VND: '₫', JPY: '¥',
  AUD: 'A$', CAD: 'C$', SGD: 'S$', THB: '฿', PHP: '₱', INR: '₹',
};

export function currencySymbol(code: string): string {
  return SYMBOLS[code.toUpperCase()] || code.toUpperCase();
}

// Currencies whose smallest unit IS the unit — no cents. Amounts for these
// must be whole numbers everywhere: Stripe, PayPal, PayOS and bank transfers.
// (Canonical list lives here; src/lib/currency.ts re-uses it for gateways.)
export const ZERO_DECIMAL_CURRENCIES = new Set([
  'bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg',
  'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf',
]);

// How each currency is conventionally written: decimal places, grouping and
// decimal separators, and where the symbol sits. A bare currency code must
// always render sensibly on its own — "₫53.99" (VND symbol glued to a
// USD-style decimal amount) is what happens when it doesn't. The currency_*
// settings override individual pieces, but only when the admin actually
// saved a value; blank means "follow the code".
type CurrencyConvention = { decimals: number; thousandSep: string; decimalSep: string; position: 'before' | 'after' };
const CURRENCY_CONVENTIONS: Record<string, CurrencyConvention> = {
  VND: { decimals: 0, thousandSep: '.', decimalSep: ',', position: 'after' },
  JPY: { decimals: 0, thousandSep: ',', decimalSep: '.', position: 'before' },
  KRW: { decimals: 0, thousandSep: ',', decimalSep: '.', position: 'before' },
  USD: { decimals: 2, thousandSep: ',', decimalSep: '.', position: 'before' },
  GBP: { decimals: 2, thousandSep: ',', decimalSep: '.', position: 'before' },
  AUD: { decimals: 2, thousandSep: ',', decimalSep: '.', position: 'before' },
  CAD: { decimals: 2, thousandSep: ',', decimalSep: '.', position: 'before' },
  SGD: { decimals: 2, thousandSep: ',', decimalSep: '.', position: 'before' },
  EUR: { decimals: 2, thousandSep: '.', decimalSep: ',', position: 'after' },
  THB: { decimals: 2, thousandSep: ',', decimalSep: '.', position: 'before' },
  PHP: { decimals: 2, thousandSep: ',', decimalSep: '.', position: 'before' },
  INR: { decimals: 2, thousandSep: ',', decimalSep: '.', position: 'before' },
};

export function currencyConvention(code: string): CurrencyConvention {
  const upper = code.toUpperCase();
  return (
    CURRENCY_CONVENTIONS[upper] || {
      decimals: ZERO_DECIMAL_CURRENCIES.has(upper.toLowerCase()) ? 0 : 2,
      thousandSep: ',',
      decimalSep: '.',
      position: 'before',
    }
  );
}

// The full display format for a bare currency code, no settings involved.
export function moneyFormatForCode(code: string): MoneyFormat {
  const upper = code.toUpperCase();
  return { code: upper, symbol: currencySymbol(upper), ...currencyConvention(upper) };
}

export const DEFAULT_MONEY_FORMAT: MoneyFormat = {
  code: 'USD', symbol: '$', position: 'before', decimals: 2, thousandSep: ',', decimalSep: '.',
};

// Builds a format from a raw settings map (server) or public config (client).
// Every piece falls back to the currency code's own conventions when the
// matching setting is blank — which is now the shipped default — so picking
// "VND" in the setup wizard is enough to get "1.370.000 ₫" with no further
// knobs to turn. Explicitly saved settings still win, piece by piece.
export function moneyFormatFrom(s: Record<string, string | undefined>): MoneyFormat {
  const code = (s.currency || 'USD').toUpperCase();
  const conv = currencyConvention(code);
  const rawDecimals = s.currency_decimals;
  const parsedDecimals = rawDecimals === undefined || rawDecimals === '' ? NaN : Number(rawDecimals);
  return {
    code,
    symbol: s.currency_symbol || currencySymbol(code),
    position:
      s.currency_symbol_position === 'after' ? 'after' : s.currency_symbol_position === 'before' ? 'before' : conv.position,
    decimals: Number.isFinite(parsedDecimals) ? Math.min(4, Math.max(0, Math.floor(parsedDecimals))) : conv.decimals,
    thousandSep: s.currency_thousand_sep ? s.currency_thousand_sep : conv.thousandSep,
    decimalSep: s.currency_decimal_sep ? s.currency_decimal_sep : conv.decimalSep,
  };
}

// Exchange rates are stored as one JSON object: target units per 1 base unit.
// Pure, so both the settings loader and the client can use it.
export function parseRates(raw: string): Record<string, number> {
  try {
    const parsed = JSON.parse(raw || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, number> = {};
    for (const [code, value] of Object.entries(parsed)) {
      const rate = Number(value);
      if (/^[A-Za-z]{3}$/.test(code) && Number.isFinite(rate) && rate > 0) {
        out[code.toUpperCase()] = rate;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function formatMoneyWith(value: number | string, fmt: MoneyFormat): string {
  const num = Number(value);
  const safe = Number.isFinite(num) ? num : 0;
  const negative = safe < 0;
  const fixed = Math.abs(safe).toFixed(fmt.decimals);
  const [whole, fraction] = fixed.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, fmt.thousandSep);
  const body = fraction ? `${grouped}${fmt.decimalSep}${fraction}` : grouped;
  // Non-breaking space so the symbol never wraps away from the amount.
  const withSymbol = fmt.position === 'after' ? `${body}\u00a0${fmt.symbol}` : `${fmt.symbol}${body}`;
  return negative ? `-${withSymbol}` : withSymbol;
}

// Back-compatible entry point. Passing an explicit currency code renders that
// currency (historical orders keep the currency they were booked in); passing
// a MoneyFormat renders with the store's configured format. The code path
// formats with the currency's own locale so VND gets vi-VN grouping and 0
// decimals here too, not en-US habits.
const INTL_LOCALE_FOR_CURRENCY: Record<string, string> = {
  VND: 'vi-VN', JPY: 'ja-JP', KRW: 'ko-KR', EUR: 'de-DE', GBP: 'en-GB', THB: 'th-TH', INR: 'en-IN',
};
export function formatMoney(value: number | string, fmt?: MoneyFormat | string): string {
  if (fmt && typeof fmt === 'object') return formatMoneyWith(value, fmt);
  const code = (fmt || 'USD').toUpperCase();
  const num = Number(value);
  const safe = Number.isFinite(num) ? num : 0;
  return new Intl.NumberFormat(INTL_LOCALE_FOR_CURRENCY[code] || 'en-US', { style: 'currency', currency: code }).format(safe);
}

// Dates always take an explicit locale. Letting Intl fall back to the
// browser's would make the server and client render different text and break
// hydration — the same class of bug the flash-sale countdown had.
export function formatDate(
  value: Date | string,
  locale: string,
  opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, opts).format(date);
}

export function formatDateTime(
  value: Date | string,
  locale: string,
  opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, opts).format(date);
}

// Thousands separators differ by locale (1,000 vs 1.000), so counts need it too.
export function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(Number.isFinite(value) ? value : 0);
}

export function formatTime(value: Date | string, locale: string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}

export function generateOrderCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 10; i += 1) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isInteger(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Custom-field definition stored on Package.customFields
export type CustomFieldDef = {
  key: string;
  label: string;
  type?: 'text' | 'email' | 'number' | 'textarea';
  required?: boolean;
  placeholder?: string;
  help?: string;
};

export function parseCustomFields(raw: unknown): CustomFieldDef[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((f): f is Record<string, unknown> => !!f && typeof f === 'object')
    .map((f) => ({
      key: String(f.key || '').slice(0, 60),
      label: String(f.label || f.key || '').slice(0, 120),
      type: (['text', 'email', 'number', 'textarea'].includes(String(f.type)) ? f.type : 'text') as CustomFieldDef['type'],
      required: f.required !== false,
      placeholder: f.placeholder ? String(f.placeholder).slice(0, 160) : undefined,
      help: f.help ? String(f.help).slice(0, 200) : undefined,
    }))
    .filter((f) => f.key);
}
