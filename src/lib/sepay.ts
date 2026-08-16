import crypto from 'crypto';
import { getSettings } from './settings';

// SePay watches the merchant's bank account and POSTs every incoming
// transaction to us. There is no outbound API to call — the whole integration
// is the webhook plus a VietQR image the customer scans.
export type SepayPayload = {
  id?: number | string;
  gateway?: string;
  transactionDate?: string;
  accountNumber?: string;
  code?: string | null;
  content?: string;
  transferType?: string;
  transferAmount?: number | string;
  referenceCode?: string;
  description?: string;
};

export async function getSepayConfig() {
  const s = await getSettings([
    'sepay_enabled', 'sepay_webhook_key', 'sepay_account_number',
    'sepay_bank_code', 'payment_ref_prefix',
  ]);
  return {
    enabled: s.sepay_enabled === 'true' && !!s.sepay_account_number,
    webhookKey: s.sepay_webhook_key,
    accountNumber: s.sepay_account_number,
    bankCode: s.sepay_bank_code,
    prefix: (s.payment_ref_prefix || 'DH').toUpperCase(),
  };
}

// SePay sends: Authorization: Apikey <key>
export function verifySepayAuth(header: string | null, key: string): boolean {
  if (!header || !key) return false;
  const match = /^Apikey\s+(.+)$/i.exec(header.trim());
  if (!match) return false;
  const given = Buffer.from(match[1]);
  const expected = Buffer.from(key);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

// Pull our reference out of the transfer. Prefer SePay's own parsed `code`,
// then fall back to scanning the memo. The prefix is mandatory: bank memos are
// full of dates and account numbers, so a bare-number match would be reckless.
export function extractRef(payload: SepayPayload, prefix: string): number | null {
  const direct = String(payload.code || '').trim();
  const fromCode = matchRef(direct, prefix);
  if (fromCode !== null) return fromCode;
  const haystack = `${payload.content || ''} ${payload.description || ''}`;
  return matchRef(haystack, prefix);
}

function matchRef(text: string, prefix: string): number | null {
  if (!text) return null;
  const safe = prefix.replace(/[^A-Za-z]/g, '');
  if (!safe) return null;
  const re = new RegExp(`(?:^|[^A-Z0-9])${safe}(\\d{4,12})(?![0-9])`, 'i');
  const m = re.exec(text.toUpperCase());
  if (!m) return null;
  const value = Number(m[1]);
  return Number.isInteger(value) ? value : null;
}
