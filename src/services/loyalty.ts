/**
 * Loyalty / điểm thưởng — cấu hình trong admin (siteConfig).
 *
 * Khóa cấu hình (siteConfig):
 *   loyalty_enabled        '1'|'0'  bật/tắt
 *   loyalty_earn_per       số đồng để được 1 điểm (mặc định 1000 -> 1 điểm/1.000đ)
 *   loyalty_redeem_value   1 điểm đổi được bao nhiêu đồng (mặc định 100)
 *   loyalty_min_redeem     số điểm tối thiểu mỗi lần đổi (mặc định 100)
 *   loyalty_max_percent    % tối đa của đơn được trả bằng điểm (mặc định 50)
 */
import prisma from '../db';
import { createNotification } from './notify';

export interface LoyaltyConfig {
  enabled: boolean;
  earnPer: number;
  redeemValue: number;
  minRedeem: number;
  maxPercent: number;
}

const DEFAULTS: LoyaltyConfig = { enabled: false, earnPer: 1000, redeemValue: 100, minRedeem: 100, maxPercent: 50 };

export async function getLoyaltyConfig(): Promise<LoyaltyConfig> {
  try {
    const keys = ['loyalty_enabled', 'loyalty_earn_per', 'loyalty_redeem_value', 'loyalty_min_redeem', 'loyalty_max_percent'];
    const rows = await prisma.siteConfig.findMany({ where: { key: { in: keys } } });
    const m: Record<string, string> = Object.fromEntries(rows.map((r: any) => [r.key, r.value || '']));
    const num = (v: string, d: number) => { const n = parseFloat(v); return Number.isFinite(n) && n > 0 ? n : d; };
    return {
      enabled: m['loyalty_enabled'] === '1' || m['loyalty_enabled'] === 'true',
      earnPer: num(m['loyalty_earn_per'], DEFAULTS.earnPer),
      redeemValue: num(m['loyalty_redeem_value'], DEFAULTS.redeemValue),
      minRedeem: num(m['loyalty_min_redeem'], DEFAULTS.minRedeem),
      maxPercent: Math.min(num(m['loyalty_max_percent'], DEFAULTS.maxPercent), 100),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

/** Số điểm tích được cho một số tiền (đồng). */
export function pointsForAmount(amount: number, cfg: LoyaltyConfig): number {
  if (!cfg.enabled || cfg.earnPer <= 0) return 0;
  return Math.floor(amount / cfg.earnPer);
}

/** Ước lượng (read-only) số đồng giảm khi đổi điểm — dùng cho pre-check số dư. */
export async function estimatePointDiscount(userId: number, requestedPoints: number, orderPayable: number): Promise<number> {
  const cfg = await getLoyaltyConfig();
  if (!cfg.enabled || !requestedPoints || requestedPoints < cfg.minRedeem) return 0;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { points: true } });
  if (!user) return 0;
  let used = Math.min(requestedPoints, user.points);
  if (used < cfg.minRedeem) return 0;
  const maxByPct = Math.floor((orderPayable * cfg.maxPercent) / 100);
  let discount = used * cfg.redeemValue;
  if (discount > maxByPct) { used = Math.floor(maxByPct / cfg.redeemValue); discount = used * cfg.redeemValue; }
  return Math.max(0, discount);
}

/** Tích điểm khi đơn hoàn tất. userId dạng số hoặc chuỗi số. Không ném lỗi. */
export async function awardPointsForOrder(userId: number | string, amount: number, orderCode: string): Promise<void> {
  try {
    const cfg = await getLoyaltyConfig();
    const pts = pointsForAmount(amount, cfg);
    if (pts <= 0) return;
    const uid = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    if (!uid || Number.isNaN(uid)) return;

    // Tránh tích trùng cho cùng một đơn
    const existed = await prisma.pointTransaction.findFirst({ where: { userId: uid, reference: orderCode, type: 'earn_order' } });
    if (existed) return;

    await prisma.$transaction(async (tx: any) => {
      const u = await tx.user.update({ where: { id: uid }, data: { points: { increment: pts } } });
      await tx.pointTransaction.create({
        data: { userId: uid, amount: pts, balanceAfter: u.points, type: 'earn_order', reference: orderCode, description: `Tích điểm đơn ${orderCode}` },
      });
    });
    createNotification(uid, { type: 'points', title: `+${pts} điểm thưởng`, body: `Từ đơn ${orderCode}`, link: '/profile' }).catch(() => {});
  } catch {
    /* bỏ qua */
  }
}

/**
 * Hoàn lại điểm đã đổi cho một đơn (khi hủy / hoàn tiền). Idempotent, không ném lỗi.
 * Chỉ hoàn phần điểm đã bị trừ (redeem_order); không đụng tới điểm đã tích.
 */
export async function refundPointsForOrder(userId: number | string | null | undefined, orderCode: string): Promise<void> {
  try {
    const uid = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    if (!uid || Number.isNaN(uid) || !orderCode) return;
    const refundedPts = await prisma.$transaction(async (tx: any) => {
      const redeemed = await tx.pointTransaction.findMany({ where: { userId: uid, reference: orderCode, type: 'redeem_order' } });
      if (!redeemed.length) return 0;
      // Đã hoàn trước đó? -> bỏ qua (idempotent)
      const already = await tx.pointTransaction.findFirst({ where: { userId: uid, reference: orderCode, type: 'refund_order' } });
      if (already) return 0;
      const totalUsed = redeemed.reduce((s: number, t: any) => s + Math.abs(t.amount), 0);
      if (totalUsed <= 0) return 0;
      const u = await tx.user.update({ where: { id: uid }, data: { points: { increment: totalUsed } } });
      await tx.pointTransaction.create({
        data: { userId: uid, amount: totalUsed, balanceAfter: u.points, type: 'refund_order', reference: orderCode, description: `Hoàn ${totalUsed} điểm do hủy đơn ${orderCode}` },
      });
      return totalUsed;
    });
    if (refundedPts > 0) {
      createNotification(uid, { type: 'points', title: `+${refundedPts} điểm hoàn lại`, body: `Đơn ${orderCode} đã hủy`, link: '/profile' }).catch(() => {});
    }
  } catch {
    /* bỏ qua */
  }
}

/**
 * Quy đổi điểm thành tiền giảm khi đặt đơn (atomic).
 * Trả về { discount, used } — số đồng giảm và số điểm đã trừ. Nếu không hợp lệ trả 0.
 */
export async function redeemPointsForOrder(
  tx: any,
  userId: number,
  requestedPoints: number,
  orderPayable: number,
  orderCode: string
): Promise<{ discount: number; used: number }> {
  const cfg = await getLoyaltyConfig();
  if (!cfg.enabled || !requestedPoints || requestedPoints <= 0) return { discount: 0, used: 0 };
  if (requestedPoints < cfg.minRedeem) return { discount: 0, used: 0 };

  const user = await tx.user.findUnique({ where: { id: userId } });
  if (!user) return { discount: 0, used: 0 };

  let used = Math.min(requestedPoints, user.points);
  if (used < cfg.minRedeem) return { discount: 0, used: 0 };

  // Giới hạn theo % đơn + theo giá trị quy đổi
  const maxDiscountByPercent = Math.floor((orderPayable * cfg.maxPercent) / 100);
  let discount = used * cfg.redeemValue;
  if (discount > maxDiscountByPercent) {
    discount = maxDiscountByPercent;
    used = Math.floor(discount / cfg.redeemValue);
    discount = used * cfg.redeemValue;
  }
  if (used <= 0 || discount <= 0) return { discount: 0, used: 0 };

  // Trừ điểm atomic
  const upd = await tx.user.updateMany({ where: { id: userId, points: { gte: used } }, data: { points: { decrement: used } } });
  if (upd.count === 0) return { discount: 0, used: 0 };
  const after = await tx.user.findUnique({ where: { id: userId }, select: { points: true } });
  await tx.pointTransaction.create({
    data: { userId, amount: -used, balanceAfter: after?.points ?? 0, type: 'redeem_order', reference: orderCode, description: `Đổi ${used} điểm khi đặt đơn ${orderCode}` },
  });
  return { discount, used };
}
