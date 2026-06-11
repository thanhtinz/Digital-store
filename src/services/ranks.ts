/**
 * Cấp bậc thành viên (rank/tier). Tự nâng hạng theo tổng chi tiêu hoặc điểm.
 * Đặc quyền: giảm giá theo hạng, giá riêng theo gói, ưu tiên đơn/hỗ trợ,
 * tên nổi bật + badge lấp lánh.
 */
import prisma from '../db';
import { createNotification } from './notify';

export function money(val: any): number {
  if (val === null || val === undefined) return 0;
  const n = parseFloat(val.toString());
  return Number.isFinite(n) ? n : 0;
}

/** Hạng mặc định cho user mới (isDefault hoặc level thấp nhất). */
export async function getDefaultRank() {
  return (
    (await prisma.userRank.findFirst({ where: { isActive: true, isDefault: true } })) ||
    (await prisma.userRank.findFirst({ where: { isActive: true }, orderBy: { level: 'asc' } }))
  );
}

/** Rà soát & nâng hạng cho 1 user theo tiêu chí tự động. Không ném lỗi. */
export async function evaluateUserRank(userId: number | string | null | undefined): Promise<void> {
  try {
    const uid = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    if (!uid || Number.isNaN(uid)) return;
    const user = await prisma.user.findUnique({ where: { id: uid } });
    if (!user || user.rankLockedManual) return;

    const ranks = await prisma.userRank.findMany({
      where: { isActive: true, requirementType: { in: ['spend', 'points'] } },
      orderBy: { level: 'desc' },
    });
    const spent = money(user.totalSpent);
    let target: any = null;
    for (const r of ranks) {
      const metric = r.requirementType === 'points' ? user.points : spent;
      if (metric >= money(r.threshold)) { target = r; break; }
    }
    // Không đạt hạng tự động nào -> giữ hạng mặc định nếu chưa có hạng.
    if (!target) {
      if (!user.rankId) {
        const def = await getDefaultRank();
        if (def) await prisma.user.update({ where: { id: uid }, data: { rankId: def.id } });
      }
      return;
    }
    if (user.rankId !== target.id) {
      // Chỉ thông báo khi lên hạng cao hơn.
      const old = user.rankId ? await prisma.userRank.findUnique({ where: { id: user.rankId } }) : null;
      await prisma.user.update({ where: { id: uid }, data: { rankId: target.id } });
      if (!old || target.level > old.level) {
        createNotification(uid, {
          type: 'system',
          title: `🎉 Bạn đã lên hạng ${target.name}!`,
          body: 'Mở khóa nhiều đặc quyền mới. Xem hồ sơ để biết chi tiết.',
          link: '/dashboard/profile',
        }).catch(() => {});
      }
    }
  } catch {
    /* nuốt lỗi */
  }
}

/** Cộng dồn chi tiêu cho user rồi xét lại hạng. */
export async function addUserSpend(userId: number | string, amount: number): Promise<void> {
  try {
    const uid = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    if (!uid || Number.isNaN(uid) || amount <= 0) return;
    await prisma.user.update({ where: { id: uid }, data: { totalSpent: { increment: amount } } });
    await evaluateUserRank(uid);
  } catch {
    /* nuốt lỗi */
  }
}

/**
 * Tính giá 1 gói theo hạng của user.
 * Ưu tiên: giá riêng theo gói (RankPrice) > giảm % của hạng > giá gốc.
 * basePrice là giá đã tính (vd flash sale). Trả về giá sau ưu đãi hạng.
 */
export async function priceForRank(packageId: number, basePrice: number, rankId: number | null | undefined): Promise<number> {
  if (!rankId) return basePrice;
  try {
    const rp = await prisma.rankPrice.findUnique({ where: { packageId_rankId: { packageId, rankId } } });
    if (rp) {
      if (rp.priceType === 'fixed' && rp.fixedPrice != null) return Math.max(0, money(rp.fixedPrice));
      if (rp.priceType === 'percent' && rp.discountPercent != null) {
        return Math.max(0, Math.round(basePrice * (1 - money(rp.discountPercent) / 100)));
      }
    }
    const rank = await prisma.userRank.findUnique({ where: { id: rankId } });
    if (rank && money(rank.discountPercent) > 0) {
      return Math.max(0, Math.round(basePrice * (1 - money(rank.discountPercent) / 100)));
    }
  } catch {
    /* lỗi -> giá gốc */
  }
  return basePrice;
}

/** Map giá theo hạng cho nhiều gói (1 truy vấn). Trả về Map<packageId, finalPrice>. */
export async function priceMapForRank(
  pkgs: { id: number; price: number }[],
  rankId: number | null | undefined
): Promise<Record<number, number>> {
  const out: Record<number, number> = {};
  for (const p of pkgs) out[p.id] = p.price;
  if (!rankId || !pkgs.length) return out;
  try {
    const rank = await prisma.userRank.findUnique({ where: { id: rankId } });
    const rankPct = rank ? money(rank.discountPercent) : 0;
    const rps = await prisma.rankPrice.findMany({ where: { rankId, packageId: { in: pkgs.map((p) => p.id) } } });
    const rpMap: Record<number, any> = {};
    for (const rp of rps) rpMap[rp.packageId] = rp;
    for (const p of pkgs) {
      const rp = rpMap[p.id];
      if (rp) {
        if (rp.priceType === 'fixed' && rp.fixedPrice != null) { out[p.id] = Math.max(0, money(rp.fixedPrice)); continue; }
        if (rp.priceType === 'percent' && rp.discountPercent != null) { out[p.id] = Math.max(0, Math.round(p.price * (1 - money(rp.discountPercent) / 100))); continue; }
      }
      if (rankPct > 0) out[p.id] = Math.max(0, Math.round(p.price * (1 - rankPct / 100)));
    }
  } catch {
    /* giữ giá gốc */
  }
  return out;
}

export function rankToDict(r: any) {
  return {
    id: r.id, name: r.name, slug: r.slug, level: r.level, color: r.color, icon: r.icon,
    sparkle: r.sparkle, highlight_name: r.highlightName,
    requirement_type: r.requirementType, threshold: money(r.threshold),
    discount_percent: money(r.discountPercent), order_priority: r.orderPriority,
    support_priority: r.supportPriority, is_active: r.isActive, is_default: r.isDefault,
  };
}
