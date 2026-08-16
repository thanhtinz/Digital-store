import type { PaymentIntent } from '@prisma/client';
import { getSettings } from './settings';

export type BankInstructions = {
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  memo: string;
  amount: number;
  currency: string;
  qrUrl: string | null;
  instructions: string;
  requiresProof: boolean;
};

// VietQR renders a scannable transfer QR with the amount and memo prefilled,
// which removes the two things customers most often get wrong.
export function vietQrUrl(bankCode: string, account: string, amount: number, memo: string): string | null {
  if (!bankCode || !account) return null;
  const params = new URLSearchParams({ amount: String(Math.round(amount)), addInfo: memo });
  return `https://img.vietqr.io/image/${encodeURIComponent(bankCode)}-${encodeURIComponent(account)}-compact2.png?${params}`;
}

export async function getBankConfig() {
  const s = await getSettings([
    'bank_transfer_enabled', 'bank_transfer_bank_name', 'bank_transfer_bank_code',
    'bank_transfer_account_number', 'bank_transfer_account_name', 'bank_transfer_instructions',
  ]);
  return {
    enabled: s.bank_transfer_enabled === 'true' && !!s.bank_transfer_account_number,
    bankName: s.bank_transfer_bank_name,
    bankCode: s.bank_transfer_bank_code,
    accountNumber: s.bank_transfer_account_number,
    accountName: s.bank_transfer_account_name,
    instructions: s.bank_transfer_instructions,
  };
}

export async function getSepayBankConfig() {
  const s = await getSettings([
    'sepay_bank_name', 'sepay_bank_code', 'sepay_account_number', 'sepay_account_name', 'sepay_instructions',
  ]);
  return {
    bankName: s.sepay_bank_name,
    bankCode: s.sepay_bank_code,
    accountNumber: s.sepay_account_number,
    accountName: s.sepay_account_name,
    instructions: s.sepay_instructions,
  };
}

// Everything the transfer screen needs, for either bank-transfer flavour.
export async function buildInstructions(intent: PaymentIntent): Promise<BankInstructions | null> {
  const cfg = intent.method === 'sepay' ? await getSepayBankConfig() : await getBankConfig();
  if (!cfg.accountNumber) return null;
  const amount = Number(intent.chargeAmount);
  const memo = intent.memo || String(intent.ref);
  return {
    bankName: cfg.bankName,
    bankCode: cfg.bankCode,
    accountNumber: cfg.accountNumber,
    accountName: cfg.accountName,
    memo,
    amount,
    currency: intent.chargeCurrency,
    qrUrl: vietQrUrl(cfg.bankCode, cfg.accountNumber, amount, memo),
    instructions: cfg.instructions,
    // SePay confirms itself through its webhook; a manual transfer needs the
    // customer to tell us they sent it so it enters the review queue.
    requiresProof: intent.method === 'bank',
  };
}
