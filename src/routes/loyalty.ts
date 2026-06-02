/**
 * Loyalty / điểm thưởng — endpoint cho user.
 * Mount tại /api/loyalty. Cấu hình do admin chỉnh qua /api/admin/settings (key loyalty_*).
 */
import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireUser } from '../middleware/auth';
import { getLoyaltyConfig } from '../services/loyalty';

const router = Router();

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
