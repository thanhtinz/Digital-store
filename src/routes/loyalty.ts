/**
 * Loyalty / điểm thưởng — endpoint cho user.
 * Mount tại /api/loyalty. Cấu hình do admin chỉnh qua /api/admin/settings (key loyalty_*).
 */
import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireUser, requireStaffOrAdmin } from '../middleware/auth';
import { getLoyaltyConfig } from '../services/loyalty';
import { getCheckinStatus, claimCheckin, redeemReward } from '../services/rewards';

const router = Router();

// ── Điểm danh hằng ngày ────────────────────────────────
router.get('/checkin', requireUser, async (req: Request, res: Response) => {
  try {
    const uid = (req as any).user.user_id;
    res.json(await getCheckinStatus(uid));
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.post('/checkin', requireUser, async (req: Request, res: Response) => {
  try {
    const uid = (req as any).user.user_id;
    const r = await claimCheckin(uid);
    res.json({ ok: true, ...r });
  } catch (e: any) {
    res.status(400).json({ detail: e.message });
  }
});

// ── Đổi thưởng (sự kiện) ───────────────────────────────
// Danh sách phần thưởng đang hoạt động (công khai cho user đã đăng nhập).
router.get('/rewards', requireUser, async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const items = await prisma.rewardItem.findMany({
      where: {
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'desc' }],
    });
    res.json({
      items: items.map((r: any) => ({
        id: r.id, name: r.name, description: r.description, image_url: r.imageUrl,
        points_cost: r.pointsCost,
        stock: r.stock, redeemed_count: r.redeemedCount,
        remaining: r.stock < 0 ? null : Math.max(0, r.stock - r.redeemedCount),
        ends_at: r.endsAt?.toISOString() || null,
      })),
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.post('/rewards/:id/redeem', requireUser, async (req: Request, res: Response) => {
  try {
    const uid = (req as any).user.user_id;
    const r = await redeemReward(uid, parseInt(req.params.id));
    res.json({ ok: true, points_spent: r.pointsSpent, delivery_data: r.deliveryData });
  } catch (e: any) {
    res.status(400).json({ detail: e.message });
  }
});

// Lịch sử đổi thưởng của user
router.get('/rewards/history', requireUser, async (req: Request, res: Response) => {
  try {
    const uid = (req as any).user.user_id;
    const rows = await prisma.rewardRedemption.findMany({
      where: { userId: uid }, orderBy: { id: 'desc' }, take: 50,
      include: { rewardItem: { select: { name: true } } },
    });
    res.json({
      items: rows.map((r: any) => ({
        id: r.id, name: r.rewardItem?.name, points_spent: r.pointsSpent,
        status: r.status, delivery_data: r.deliveryData, created_at: r.createdAt?.toISOString(),
      })),
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Admin: CRUD phần thưởng ────────────────────────────
router.get('/admin/rewards', requireStaffOrAdmin, async (_req: Request, res: Response) => {
  try {
    const items = await prisma.rewardItem.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'desc' }] });
    res.json({ items });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.post('/admin/rewards', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const b = req.body;
    const item = await prisma.rewardItem.create({
      data: {
        name: b.name, description: b.description || null, imageUrl: b.image_url || null,
        packageId: b.package_id ? Number(b.package_id) : null,
        pointsCost: Math.max(0, Number(b.points_cost) || 0),
        stock: b.stock === undefined || b.stock === null || b.stock === '' ? -1 : Number(b.stock),
        perUserLimit: Number(b.per_user_limit) || 0,
        startsAt: b.starts_at ? new Date(b.starts_at) : null,
        endsAt: b.ends_at ? new Date(b.ends_at) : null,
        isActive: b.is_active !== false,
        sortOrder: Number(b.sort_order) || 0,
      },
    });
    res.status(201).json(item);
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.patch('/admin/rewards/:id', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const b = req.body;
    const item = await prisma.rewardItem.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(b.name !== undefined && { name: b.name }),
        ...(b.description !== undefined && { description: b.description || null }),
        ...(b.image_url !== undefined && { imageUrl: b.image_url || null }),
        ...(b.package_id !== undefined && { packageId: b.package_id ? Number(b.package_id) : null }),
        ...(b.points_cost !== undefined && { pointsCost: Math.max(0, Number(b.points_cost) || 0) }),
        ...(b.stock !== undefined && { stock: b.stock === null || b.stock === '' ? -1 : Number(b.stock) }),
        ...(b.per_user_limit !== undefined && { perUserLimit: Number(b.per_user_limit) || 0 }),
        ...(b.starts_at !== undefined && { startsAt: b.starts_at ? new Date(b.starts_at) : null }),
        ...(b.ends_at !== undefined && { endsAt: b.ends_at ? new Date(b.ends_at) : null }),
        ...(b.is_active !== undefined && { isActive: !!b.is_active }),
        ...(b.sort_order !== undefined && { sortOrder: Number(b.sort_order) || 0 }),
      },
    });
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.delete('/admin/rewards/:id', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.rewardItem.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// Cấu hình điểm thưởng (công khai, để checkout hiển thị)
router.get('/config', async (_req: Request, res: Response) => {
  try {
    const cfg = await getLoyaltyConfig();
    res.json({
      enabled: cfg.enabled,
      earn_per: cfg.earnPer,
      redeem_value: cfg.redeemValue,
      min_redeem: cfg.minRedeem,
      max_percent: cfg.maxPercent,
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// Điểm hiện có + lịch sử của user
router.get('/me', requireUser, async (req: Request, res: Response) => {
  try {
    const uid = (req as any).user.user_id;
    const [user, history, cfg] = await Promise.all([
      prisma.user.findUnique({ where: { id: uid }, select: { points: true } }),
      prisma.pointTransaction.findMany({ where: { userId: uid }, orderBy: { id: 'desc' }, take: 50 }),
      getLoyaltyConfig(),
    ]);
    res.json({
      points: user?.points || 0,
      value: (user?.points || 0) * cfg.redeemValue,
      config: { enabled: cfg.enabled, earn_per: cfg.earnPer, redeem_value: cfg.redeemValue, min_redeem: cfg.minRedeem, max_percent: cfg.maxPercent },
      history: history.map((h: any) => ({
        id: h.id, amount: h.amount, balance_after: h.balanceAfter,
        type: h.type, description: h.description, reference: h.reference,
        created_at: h.createdAt?.toISOString(),
      })),
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

export default router;
