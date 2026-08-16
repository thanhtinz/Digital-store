import prisma from './db';
import type { PaymentIntent } from '@prisma/client';
import { getSettings } from './settings';
import { convertAmount, getMoneyConfig } from './currency';
import { markOrderPaid, releaseOrderResources } from './orders';
import { completeTopup } from './wallet';
import { activateGiftCard } from './giftcards';
import { sendTelegram, escapeHtml } from './telegram';

export type PaymentPurpose = 'ORDER' | 'TOPUP' | 'GIFTCARD';
// Methods that route through an intent. Card gateways keep their own flow.
export type IntentMethod = 'sepay' | 'payos' | 'bank';

export const INTENT_METHODS: IntentMethod[] = ['sepay', 'payos', 'bank'];

export function isIntentMethod(value: unknown): value is IntentMethod {
  return typeof value === 'string' && (INTENT_METHODS as string[]).includes(value);
}

// Which of the three are switched on and fully configured.
export async function enabledIntentMethods(): Promise<Record<IntentMethod, boolean>> {
  const s = await getSettings([
    'sepay_enabled', 'sepay_account_number', 'sepay_bank_code',
    'payos_enabled', 'payos_client_id', 'payos_api_key', 'payos_checksum_key',
    'bank_transfer_enabled', 'bank_transfer_account_number',
  ]);
  return {
    sepay: s.sepay_enabled === 'true' && !!s.sepay_account_number && !!s.sepay_bank_code,
    payos: s.payos_enabled === 'true' && !!s.payos_client_id && !!s.payos_api_key && !!s.payos_checksum_key,
    bank: s.bank_transfer_enabled === 'true' && !!s.bank_transfer_account_number,
  };
}

export class PaymentError extends Error {}

// Creates the intent and freezes the converted amount onto it.
export async function createIntent(params: {
  purpose: PaymentPurpose;
  targetId: number;
  userId: number;
  baseAmount: number;
  method: IntentMethod;
}): Promise<PaymentIntent> {
  const { purpose, targetId, userId, baseAmount, method } = params;
  const enabled = await enabledIntentMethods();
  if (!enabled[method]) throw new PaymentError('That payment method is not available right now');

  const cfg = await getMoneyConfig();
  const s = await getSettings(['payment_ref_base', 'payment_ref_prefix', 'payment_expiry_minutes']);
  const refBase = Number(s.payment_ref_base) || 100000;
  const prefix = (s.payment_ref_prefix || 'DH').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6) || 'DH';
  const minutes = Math.min(1440, Math.max(5, Number(s.payment_expiry_minutes) || 60));

  let charge: { amount: number; rate: number };
  try {
    charge = convertAmount(baseAmount, cfg.base.code, cfg.paymentCurrency, cfg.rates, cfg.roundStep);
  } catch {
    throw new PaymentError(`No exchange rate is configured for ${cfg.paymentCurrency}`);
  }

  // ref must be unique and numeric; derive it from the row id so it is stable
  // and collision-free without a second sequence.
  const created = await prisma.paymentIntent.create({
    data: {
      ref: 0,
      purpose,
      targetId,
      userId,
      method,
      baseAmount,
      baseCurrency: cfg.base.code,
      chargeAmount: charge.amount,
      chargeCurrency: cfg.paymentCurrency,
      fxRate: charge.rate,
      expiresAt: new Date(Date.now() + minutes * 60_000),
    },
  });
  const ref = refBase + created.id;
  return prisma.paymentIntent.update({
    where: { id: created.id },
    data: { ref, memo: `${prefix}${ref}` },
  });
}

// The single place an intent becomes PAID. Returns false when it lost the
// race, so callers can report "already settled" instead of double-crediting.
export async function settleIntent(intentId: number, gatewayRef?: string, raw?: unknown): Promise<boolean> {
  const intent = await prisma.paymentIntent.findUnique({ where: { id: intentId } });
  if (!intent) return false;

  const flipped = await prisma.paymentIntent.updateMany({
    where: { id: intentId, status: { in: ['PENDING', 'AWAITING_REVIEW'] } },
    data: {
      status: 'PAID',
      paidAt: new Date(),
      ...(gatewayRef ? { gatewayRef } : {}),
      ...(raw !== undefined ? { raw: raw as any } : {}),
    },
  });
  if (flipped.count !== 1) return false;

  // Each of these is independently idempotent, so even a bypassed CAS above
  // could not credit twice.
  if (intent.purpose === 'ORDER') await markOrderPaid(intent.targetId, gatewayRef);
  else if (intent.purpose === 'TOPUP') await completeTopup(intent.targetId);
  else if (intent.purpose === 'GIFTCARD') await activateGiftCard(intent.targetId);
  return true;
}

// Marks the intent dead and hands back whatever its target was holding.
export async function failIntent(
  intentId: number,
  status: 'CANCELLED' | 'FAILED' | 'EXPIRED',
  reason?: string
): Promise<boolean> {
  const intent = await prisma.paymentIntent.findUnique({ where: { id: intentId } });
  if (!intent) return false;
  const flipped = await prisma.paymentIntent.updateMany({
    where: { id: intentId, status: { in: ['PENDING', 'AWAITING_REVIEW'] } },
    data: { status, reviewNote: reason?.slice(0, 300) },
  });
  if (flipped.count !== 1) return false;
  await releaseIntentTarget(intent);
  return true;
}

// Rolls back the thing the intent was paying for.
export async function releaseIntentTarget(intent: PaymentIntent): Promise<void> {
  if (intent.purpose === 'ORDER') {
    const order = await prisma.order.findUnique({ where: { id: intent.targetId } });
    if (order && order.status === 'PENDING') {
      await prisma.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } });
      await releaseOrderResources(order.id);
    }
  } else if (intent.purpose === 'TOPUP') {
    await prisma.topup.updateMany({
      where: { id: intent.targetId, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });
  } else if (intent.purpose === 'GIFTCARD') {
    // Soft-cancel rather than delete, so the buyer's history stays honest.
    await prisma.giftCard.updateMany({
      where: { id: intent.targetId, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });
  }
}

export async function findIntentByRef(ref: number): Promise<PaymentIntent | null> {
  if (!Number.isInteger(ref)) return null;
  return prisma.paymentIntent.findUnique({ where: { ref } });
}

// Swept by the background scheduler alongside stale orders.
export async function expireStaleIntents(): Promise<number> {
  const stale = await prisma.paymentIntent.findMany({
    where: { status: 'PENDING', expiresAt: { lt: new Date() } },
    take: 200,
  });
  let expired = 0;
  for (const intent of stale) {
    if (await failIntent(intent.id, 'EXPIRED', 'Payment window elapsed')) expired += 1;
  }
  return expired;
}

// Tells the owner when money arrived that we could not match to an intent, so
// a mistyped transfer memo never means silently swallowed funds.
export function warnUnmatched(detail: string): void {
  console.warn('[payments] unmatched transfer:', detail);
  sendTelegram(`<b>Unmatched bank transfer</b>\n${escapeHtml(detail)}`).catch(() => {});
}
