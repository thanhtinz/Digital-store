/**
 * Điểm danh hằng ngày + đổi thưởng (sự kiện).
 * Cấu hình (siteConfig):
 *   checkin_enabled   '1'|'0'
 *   checkin_rewards   JSON: [{ day: 1, points: 1 }, ...] (mốc theo ngày streak)
 */
import prisma from '../db';
import { createNotification } from './notify';
import { autoDeliver } from './orders';

// Ngày hiện tại theo giờ VN (UTC+7), dạng YYYY-MM-DD.
export function vnDateStr(offsetDays = 0): string {
  const d = new Date(Date.now() + 7 * 3600 * 1000 + offsetDays * 86400 * 1000);
  return d.toISOString().slice(0, 10);
}

export interface CheckinMilestone { day: number; points: number; }
export interface CheckinConfig { enabled: boolean; milestones: CheckinMilestone[]; }

const DEFAULT_MILESTONES: CheckinMilestone[] = [
  { day: 1, points: 1 }, { day: 2, points: 2 }, { day: 3, points: 3 },
  { day: 4, points: 4 }, { day: 5, points: 5 }, { day: 6, points: 6 }, { day: 7, points: 10 },
];

export async function getCheckinConfig(): Promise<CheckinConfig> {
  try {
    const rows = await prisma.siteConfig.findMany({ where: { key: { in: ['checkin_enabled', 'checkin_rewards'] } } });
    const m: Record<string, string> = Object.fromEntries(rows.map((r: any) => [r.key, r.value || '']));
    let milestones: CheckinMilestone[] = DEFAULT_MILESTONES;
    if (m['checkin_rewards']) {
      try {
        const parsed = JSON.parse(m['checkin_rewards']);
        if (Array.isArray(parsed) && parsed.length) {
          milestones = parsed
            .map((x: any, i: number) => ({ day: Number(x.day) || i + 1, points: Math.max(0, Number(x.points) || 0) }))
            .sort((a, b) => a.day - b.day);
        }
      } catch { /* dùng mặc định */ }
    }
    return { enabled: m['checkin_enabled'] === '1' || m['checkin_enabled'] === 'true', milestones };
  } catch {
    return { enabled: false, milestones: DEFAULT_MILESTONES };
  }
}

// Điểm cho ngày streak thứ N (lặp vòng theo số mốc).
function pointsForStreak(streak: number, milestones: CheckinMilestone[]): number {
  if (!milestones.length) return 0;
  const idx = (Math.max(1, streak) - 1) % milestones.length;
  return milestones[idx]?.points || 0;
}

export async function getCheckinStatus(userId: number) {
  const cfg = await getCheckinConfig();
  const today = vnDateStr();
  const yesterday = vnDateStr(-1);
  const last = await prisma.checkin.findFirst({ where: { userId }, orderBy: { date: 'desc' } });
  const claimedToday = last?.date === today;
  const currentStreak = last ? (last.date === today ? last.streak : last.date === yesterday ? last.streak : 0) : 0;
  const nextStreak = claimedToday ? currentStreak : last?.date === yesterday ? currentStreak + 1 : 1;
  return {
    enabled: cfg.enabled,
    claimed_today: claimedToday,
    streak: currentStreak,
    next_streak: nextStreak,
    next_points: pointsForStreak(nextStreak, cfg.milestones),
    milestones: cfg.milestones,
  };
}

export async function claimCheckin(userId: number): Promise<{ points: number; streak: number }> {
  const cfg = await getCheckinConfig();
  if (!cfg.enabled) throw new Error('Tính năng điểm danh đang tắt');
  const today = vnDateStr();
  const yesterday = vnDateStr(-1);

  const existing = await prisma.checkin.findUnique({ where: { userId_date: { userId, date: today } } });
  if (existing) throw new Error('Hôm nay bạn đã điểm danh rồi');

  const last = await prisma.checkin.findFirst({ where: { userId }, orderBy: { date: 'desc' } });
  const streak = last?.date === yesterday ? last.streak + 1 : 1;
  const points = pointsForStreak(streak, cfg.milestones);

  await prisma.$transaction(async (tx: any) => {
    await tx.checkin.create({ data: { userId, date: today, points, streak } });
    if (points > 0) {
      const u = await tx.user.update({ where: { id: userId }, data: { points: { increment: points } } });
      await tx.pointTransaction.create({
        data: { userId, amount: points, balanceAfter: u.points, type: 'checkin', reference: today, description: `Điểm danh ngày ${streak}` },
      });
    }
  });
  if (points > 0) {
    createNotification(userId, { type: 'points', title: `+${points} điểm điểm danh`, body: `Chuỗi ${streak} ngày`, link: '/dashboard/rewards' }).catch(() => {});
  }
  return { points, streak };
}

// ── Đổi thưởng ─────────────────────────────────────────
export async function redeemReward(userId: number, rewardItemId: number): Promise<{ pointsSpent: number; deliveryData: string | null }> {
  const now = new Date();
  return prisma.$transaction(async (tx: any) => {
    const item = await tx.rewardItem.findUnique({ where: { id: rewardItemId } });
    if (!item || !item.isActive) throw new Error('Phần thưởng không khả dụng');
    if (item.startsAt && now < item.startsAt) throw new Error('Sự kiện chưa bắt đầu');
    if (item.endsAt && now > item.endsAt) throw new Error('Sự kiện đã kết thúc');
    if (item.stock >= 0 && item.redeemedCount >= item.stock) throw new Error('Phần thưởng đã hết');

    if (item.perUserLimit > 0) {
      const used = await tx.rewardRedemption.count({ where: { userId, rewardItemId } });
      if (used >= item.perUserLimit) throw new Error('Bạn đã đổi tối đa phần thưởng này');
    }

    // Trừ điểm atomic
    const deduct = await tx.user.updateMany({ where: { id: userId, points: { gte: item.pointsCost } }, data: { points: { decrement: item.pointsCost } } });
    if (deduct.count === 0) throw new Error('Bạn không đủ điểm');
    const after = await tx.user.findUnique({ where: { id: userId }, select: { points: true } });
    await tx.pointTransaction.create({
      data: { userId, amount: -item.pointsCost, balanceAfter: after?.points ?? 0, type: 'redeem_reward', reference: `reward:${item.id}`, description: `Đổi thưởng: ${item.name}` },
    });

    // Tăng số đã đổi có điều kiện (chống vượt kho khi đồng thời)
    if (item.stock >= 0) {
      const ok = await tx.rewardItem.updateMany({ where: { id: item.id, redeemedCount: { lt: item.stock } }, data: { redeemedCount: { increment: 1 } } });
      if (ok.count === 0) throw new Error('Phần thưởng đã hết');
    } else {
      await tx.rewardItem.update({ where: { id: item.id }, data: { redeemedCount: { increment: 1 } } });
    }

    const redemption = await tx.rewardRedemption.create({
      data: { userId, rewardItemId: item.id, pointsSpent: item.pointsCost, status: 'completed' },
    });
    return { redemption, item };
  }).then(async ({ redemption, item }: any) => {
    // Giao gói (nếu có) qua đơn hàng — ngoài transaction điểm để đơn giản hoá.
    let deliveryData: string | null = null;
    if (item.packageId) {
      try {
        const orderCode = `RW${Date.now().toString(36).toUpperCase()}`;
        const order = await prisma.order.create({
          data: {
            orderCode, userId: String(userId), packageId: item.packageId, quantity: 1,
            subtotalAmount: 0, discountAmount: 0, totalAmount: 0, status: 'paid',
            paymentMethod: 'points', notes: `Đổi thưởng: ${item.name}`,
          },
        });
        await autoDeliver(order.id);
        const fresh = await prisma.order.findUnique({ where: { id: order.id } });
        deliveryData = fresh?.deliveryData || null;
        if (deliveryData) await prisma.rewardRedemption.update({ where: { id: redemption.id }, data: { deliveryData } });
      } catch { /* nếu giao lỗi vẫn giữ redemption; admin xử lý thủ công */ }
    }
    createNotification(userId, { type: 'points', title: `Đổi thưởng thành công: ${item.name}`, body: deliveryData ? 'Xem thông tin trong lịch sử đổi thưởng' : 'Phần thưởng sẽ được xử lý sớm', link: '/dashboard/rewards' }).catch(() => {});
    return { pointsSpent: item.pointsCost, deliveryData };
  });
}
