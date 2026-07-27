import crypto from 'crypto';
import prisma from './db';
import { creditWallet } from './wallet';
import { notifyUser } from './notify';
import { emailLayout } from './mail';
import { getSettings } from './settings';
import { escapeHtml } from './telegram';

export function generateGiftCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const block = () =>
    Array.from(crypto.randomBytes(4)).map((b) => chars[b % chars.length]).join('');
  return `GIFT-${block()}-${block()}-${block()}`;
}

// PENDING → ACTIVE after payment (idempotent), then tell the buyer the code.
export async function activateGiftCard(id: number): Promise<void> {
  const res = await prisma.giftCard.updateMany({
    where: { id, status: 'PENDING' },
    data: { status: 'ACTIVE' },
  });
  if (res.count !== 1) return;

  const card = await prisma.giftCard.findUnique({ where: { id } });
  if (!card?.buyerId) return;
  const { site_name: siteName } = await getSettings(['site_name']);
  await notifyUser(card.buyerId, {
    subject: `Your ${siteName} gift card is ready`,
    html: emailLayout(
      siteName,
      'Your gift card is ready',
      `<p>Thank you for your purchase! Here is your <b>$${Number(card.amount).toFixed(2)}</b> gift card code:</p>
       <p style="font-size:22px;font-weight:bold;letter-spacing:2px;background:#eef2ff;color:#4338ca;padding:12px 16px;border-radius:8px;text-align:center">${card.code}</p>
       <p>Send it to anyone — they redeem it on the Gift cards page and the amount lands in their wallet instantly. It never expires.</p>`
    ),
    text: `<b>Your gift card is ready</b>\nAmount: $${Number(card.amount).toFixed(2)}\nCode: <code>${escapeHtml(card.code)}</code>\nRedeemable on the Gift cards page — it never expires.`,
  }).catch(() => {});
}

// Atomic redeem: only one redeemer can ever win the row update.
export async function redeemGiftCard(code: string, userId: number): Promise<{ ok: true; amount: number } | { ok: false; reason: string }> {
  const normalized = code.trim().toUpperCase();
  const card = await prisma.giftCard.findUnique({ where: { code: normalized } });
  if (!card || card.status === 'PENDING') return { ok: false, reason: 'Invalid gift card code' };
  if (card.status === 'REDEEMED') return { ok: false, reason: 'This gift card has already been redeemed' };

  const res = await prisma.giftCard.updateMany({
    where: { id: card.id, status: 'ACTIVE' },
    data: { status: 'REDEEMED', redeemedById: userId, redeemedAt: new Date() },
  });
  if (res.count !== 1) return { ok: false, reason: 'This gift card has already been redeemed' };

  await creditWallet(userId, Number(card.amount), 'GIFT', `Gift card ${card.code}`);
  return { ok: true, amount: Number(card.amount) };
}
