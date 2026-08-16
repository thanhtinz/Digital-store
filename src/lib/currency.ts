import { getSettings } from './settings';
import { currencySymbol, formatMoneyWith, moneyFormatFrom, parseRates, type MoneyFormat } from './utils';

export { parseRates };

// Currencies whose smallest unit IS the unit — no cents. Amounts for these
// must be whole numbers everywhere: Stripe, PayPal, PayOS and bank transfers.
export const ZERO_DECIMAL_CURRENCIES = new Set([
  'bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg',
  'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf',
]);

export function isZeroDecimal(code: string): boolean {
  return ZERO_DECIMAL_CURRENCIES.has(code.toLowerCase());
}

// Used by the admin save path so a malformed blob is rejected at the door
// rather than surfacing as a broken checkout later.
export function validateRatesJson(
  raw: string,
  baseCode: string
): { ok: true; rates: Record<string, number> } | { ok: false; reason: string } {
  const text = (raw || '').trim();
  if (!text) return { ok: true, rates: {} };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'Exchange rates must be valid JSON, e.g. {"VND": 25400}' };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, reason: 'Exchange rates must be a JSON object of currency code to rate' };
  }
  const entries = Object.entries(parsed as Record<string, unknown>);
  if (entries.length > 20) return { ok: false, reason: 'At most 20 exchange rates can be configured' };
  const rates: Record<string, number> = {};
  for (const [code, value] of entries) {
    if (!/^[A-Za-z]{3}$/.test(code)) {
      return { ok: false, reason: `"${code}" is not a 3-letter currency code` };
    }
    const upper = code.toUpperCase();
    if (upper === baseCode.toUpperCase()) {
      return { ok: false, reason: `${upper} is the base currency — its rate is always 1` };
    }
    const rate = Number(value);
    if (!Number.isFinite(rate) || rate <= 0) {
      return { ok: false, reason: `The rate for ${upper} must be a number greater than 0` };
    }
    rates[upper] = rate;
  }
  return { ok: true, rates };
}

export type MoneyConfig = {
  base: MoneyFormat;
  rates: Record<string, number>;
  roundStep: number;
  paymentCurrency: string;
};

export async function getMoneyConfig(): Promise<MoneyConfig> {
  const s = await getSettings([
    'currency', 'currency_decimals', 'currency_symbol', 'currency_symbol_position',
    'currency_thousand_sep', 'currency_decimal_sep', 'currency_rates',
    'currency_round_step', 'payment_currency',
  ]);
  const roundStep = Number(s.currency_round_step);
  return {
    base: moneyFormatFrom(s),
    rates: parseRates(s.currency_rates),
    roundStep: Number.isFinite(roundStep) && roundStep > 0 ? roundStep : 1,
    paymentCurrency: (s.payment_currency || 'VND').toUpperCase(),
  };
}

// Converts a base-currency amount into what a gateway should collect.
// Zero-decimal targets round UP to roundStep: the store never under-charges,
// and the customer gets a clean number to type into their banking app.
export function convertAmount(
  baseAmount: number,
  from: string,
  to: string,
  rates: Record<string, number>,
  roundStep = 1
): { amount: number; rate: number } {
  const fromCode = from.toUpperCase();
  const toCode = to.toUpperCase();
  if (fromCode === toCode) {
    return { amount: roundForCurrency(baseAmount, toCode, 1), rate: 1 };
  }
  const rate = rates[toCode];
  if (!rate) throw new Error(`No exchange rate configured for ${toCode}`);
  return { amount: roundForCurrency(baseAmount * rate, toCode, roundStep), rate };
}

function roundForCurrency(amount: number, code: string, roundStep: number): number {
  if (!isZeroDecimal(code)) return Math.round(amount * 100) / 100;
  const step = roundStep > 0 ? roundStep : 1;
  return Math.ceil(amount / step) * step;
}

// Integer amount for gateways that take minor units (Stripe, PayOS).
export function minorUnits(amount: number, currency: string): number {
  return isZeroDecimal(currency) ? Math.round(amount) : Math.round(amount * 100);
}

// String amount for gateways that take a decimal string (PayPal). Sending
// "1270000.00" for a zero-decimal currency is rejected as DECIMALS_NOT_SUPPORTED.
export function decimalString(amount: number, currency: string): string {
  return isZeroDecimal(currency) ? String(Math.round(amount)) : amount.toFixed(2);
}

function formatIn(value: number | string, base: MoneyFormat, currency?: string): string {
  if (currency && currency.toUpperCase() !== base.code) {
    const code = currency.toUpperCase();
    return formatMoneyWith(value, {
      ...base,
      code,
      symbol: currencySymbol(code),
      decimals: isZeroDecimal(code) ? 0 : base.decimals,
    });
  }
  return formatMoneyWith(value, base);
}

// Server-side money rendering for emails, Telegram messages and API errors.
export async function formatMoneyServer(value: number | string, currency?: string): Promise<string> {
  const cfg = await getMoneyConfig();
  return formatIn(value, cfg.base, currency);
}

// Returns a bound formatter so a server component reads the settings once and
// then formats every row synchronously.
export async function getMoneyFormatter() {
  const cfg = await getMoneyConfig();
  return (value: number | string, currency?: string) => formatIn(value, cfg.base, currency);
}
