/**
 * Huy hiệu thành viên. Tự trao theo tiêu chí (số đơn / tổng chi / số đánh giá / điểm).
 * Gọi evaluateUserBadges(userId) sau khi hoàn tất đơn, viết đánh giá, cộng điểm...
 */
import prisma from '../db';
import { createNotification } from './notify';

const PAID_STATUSES = ['completed', 'paid', 'delivered', 'success'];

async function userMetric(userId: number, type: string): Promise<number> {
  const uidStr = String(userId);
  if (type === 'orders') {
    return prisma.order.count({ where: { userId: uidStr, status: { in: PAID_STATUSES } } });
  }
  if (type === 'spend') {
    const agg = await prisma.order.aggregate({
      where: { userId: uidStr, status: { in: PAID_STATUSES } },
      _sum: { totalAmount: true },
    });
    return Number(agg._sum.totalAmount || 0);
  }
  if (type === 'reviews') {
    return prisma.review.count({ where: { userId: uidStr } });
  }
  if (type === 'points') {
    const u = await prisma.user.findUnique({ where: { id: userId } });
    return u?.points || 0;
  }
  return 0;
}

/** Đánh giá & trao các huy hiệu tự động cho 1 user. Không ném lỗi. */
export async function evaluateUserBadges(userId: number | string | null | undefined): Promise<void> {
  try {
    const uid = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    if (!uid || Number.isNaN(uid)) return;
    const badges = await prisma.badge.findMany({
      where: { isActive: true, criteriaType: { not: null }, threshold: { not: null } },
    });
    if (!badges.length) return;
    const owned = await prisma.userBadge.findMany({ where: { userId: uid }, select: { badgeId: true } });
    const ownedSet = new Set(owned.map((o: any) => o.badgeId));
    // Gom theo loại tiêu chí để chỉ tính metric 1 lần.
    const metricCache: Record<string, number> = {};
    for (const b of badges) {
      if (ownedSet.has(b.id)) continue;
      const type = b.criteriaType as string;
      if (metricCache[type] === undefined) metricCache[type] = await userMetric(uid, type);
      if (metricCache[type] >= Number(b.threshold)) {
        await prisma.userBadge.create({ data: { userId: uid, badgeId: b.id } }).catch(() => {});
        createNotification(uid, {
          type: 'system',
          title: `🏅 Bạn vừa nhận huy hiệu "${b.name}"`,
          body: b.description || undefined,
          link: '/dashboard/profile',
        }).catch(() => {});
      }
    }
  } catch {
    /* nuốt lỗi */
  }
}
