import prisma from './db';
import { formatMoneyServer } from './currency';

export type CouponCheck =
  | { ok: true; couponId: number; code: string; discount: number }
  | { ok: false; reason: string };

// Validates a coupon for a given user + subtotal and computes the discount.
export async function checkCoupon(code: string, userId: number, subtotal: number): Promise<CouponCheck> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { ok: false, reason: 'Enter a coupon code' };

  const coupon = await prisma.coupon.findUnique({ where: { code: normalized } });
  if (!coupon || !coupon.isActive) return { ok: false, reason: 'Invalid coupon code' };

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) return { ok: false, reason: 'This coupon is not active yet' };
  if (coupon.endsAt && coupon.endsAt < now) return { ok: false, reason: 'This coupon has expired' };
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    return { ok: false, reason: 'This coupon has reached its usage limit' };
  }
  if (coupon.minOrder != null && subtotal < Number(coupon.minOrder)) {
    return { ok: false, reason: `Minimum order for this coupon is ${await formatMoneyServer(Number(coupon.minOrder))}` };
  }
  if (coupon.perUserLimit != null) {
    const used = await prisma.couponRedemption.count({ where: { couponId: coupon.id, userId } });
    if (used >= coupon.perUserLimit) return { ok: false, reason: 'You have already used this coupon' };
  }

  let discount = coupon.type === 'PERCENT'
    ? (subtotal * Number(coupon.value)) / 100
    : Number(coupon.value);
  if (coupon.type === 'PERCENT' && coupon.maxDiscount != null) {
    discount = Math.min(discount, Number(coupon.maxDiscount));
  }
  discount = Math.min(Math.round(discount * 100) / 100, subtotal);
  if (discount <= 0) return { ok: false, reason: 'This coupon does not apply to your order' };

  return { ok: true, couponId: coupon.id, code: normalized, discount };
}
