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

export const DEFAULT_MONEY_FORMAT: MoneyFormat = {
  code: 'USD', symbol: '$', position: 'before', decimals: 2, thousandSep: ',', decimalSep: '.',
};

// Builds a format from a raw settings map (server) or public config (client).
export function moneyFormatFrom(s: Record<string, string | undefined>): MoneyFormat {
  const code = (s.currency || 'USD').toUpperCase();
  const decimals = Number(s.currency_decimals);
  return {
    code,
    symbol: s.currency_symbol || currencySymbol(code),
    position: s.currency_symbol_position === 'after' ? 'after' : 'before',
    decimals: Number.isFinite(decimals) ? Math.min(4, Math.max(0, Math.floor(decimals))) : 2,
    thousandSep: s.currency_thousand_sep ?? ',',
    decimalSep: s.currency_decimal_sep ?? '.',
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
// a MoneyFormat renders with the store's configured format.
export function formatMoney(value: number | string, fmt?: MoneyFormat | string): string {
  if (fmt && typeof fmt === 'object') return formatMoneyWith(value, fmt);
  const code = (fmt || 'USD').toUpperCase();
  const num = Number(value);
  const safe = Number.isFinite(num) ? num : 0;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(safe);
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
