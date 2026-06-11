/**
 * Tài khoản — tính năng phụ trợ cho user đã đăng nhập:
 *  - Web Push: lấy public key, đăng ký/huỷ thiết bị nhận push.
 *  - Quyền sử dụng (entitlements): danh sách gói premium có hạn + ngày hết hạn.
 * Mount tại /api/account.
 */
import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireUser } from '../middleware/auth';
import { getPublicVapidKey } from '../services/push';

const router = Router();

// ── Web Push ───────────────────────────────────────────
router.get('/push/public-key', async (_req: Request, res: Response) => {
  const key = await getPublicVapidKey();
  res.json({ public_key: key || '' });
});

router.post('/push/subscribe', requireUser, async (req: Request, res: Response) => {
  try {
    const payload = (req as any).user;
    const sub = req.body?.subscription || req.body;
    const endpoint = sub?.endpoint;
    const p256dh = sub?.keys?.p256dh;
    const auth = sub?.keys?.auth;
    if (!endpoint || !p256dh || !auth) { res.status(400).json({ detail: 'Subscription không hợp lệ' }); return; }
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { userId: payload.user_id, p256dh, auth, userAgent: String(req.headers['user-agent'] || '').slice(0, 500) },
      create: { userId: payload.user_id, endpoint, p256dh, auth, userAgent: String(req.headers['user-agent'] || '').slice(0, 500) },
    });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.post('/push/unsubscribe', requireUser, async (req: Request, res: Response) => {
  try {
    const endpoint = req.body?.endpoint;
    if (endpoint) await prisma.pushSubscription.deleteMany({ where: { endpoint } });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Entitlements: gói premium có hạn của tôi ───────────
router.get('/entitlements', requireUser, async (req: Request, res: Response) => {
  try {
    const payload = (req as any).user;
    const now = new Date();
    const items = await prisma.userEntitlement.findMany({
      where: { userId: payload.user_id },
      orderBy: { expiresAt: 'asc' },
      take: 100,
    });
    res.json({
      items: items.map((e: any) => {
        const days = Math.ceil((new Date(e.expiresAt).getTime() - now.getTime()) / 86400000);
        return {
          id: e.id,
          product_name: e.productName,
          package_name: e.packageName,
          package_id: e.packageId,
          starts_at: e.startsAt,
          expires_at: e.expiresAt,
          days_left: days,
          status: days <= 0 ? 'expired' : 'active',
        };
      }),
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

export default router;
