/**
 * Affiliate Routes
 *  - User: đăng ký affiliate, xem thống kê
 *  - Admin: danh sách, referrals, cập nhật, duyệt hoa hồng
 */

import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import prisma from '../db';
import { requireUser, requireAdmin } from '../middleware/auth';
import { money } from '../services/orders';

const router = Router();

function affToDict(a: any) {
  return {
    id: a.id,
    user_id: a.userId,
    email: a.email,
    ref_code: a.refCode,
    commission_rate: money(a.commissionRate),
    total_earnings: money(a.totalEarnings),
    total_paid: money(a.totalPaid),
    is_active: a.isActive,
    created_at: a.createdAt?.toISOString(),
  };
}

function refToDict(r: any) {
  return {
    id: r.id,
    order_id: r.orderId,
    order_amount: money(r.orderAmount),
    commission: money(r.commission),
    status: r.status,
    created_at: r.createdAt?.toISOString(),
  };
}

function genRefCode(): string {
  return randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
}

// ── User ────────────────────────────────────────────────
router.get('/me', requireUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const aff = await prisma.affiliateUser.findUnique({ where: { userId: String(user.user_id) } });
    if (!aff) { res.json({ registered: false }); return; }
    const refs = await prisma.affiliateReferral.findMany({
      where: { affiliateId: aff.id },
      orderBy: { id: 'desc' },
      take: 50,
    });
    res.json({ registered: true, ...affToDict(aff), referrals: refs.map(refToDict) });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.post('/register', requireUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const existing = await prisma.affiliateUser.findUnique({ where: { userId: String(user.user_id) } });
    if (existing) { res.json(affToDict(existing)); return; }

    let refCode = genRefCode();
    while (await prisma.affiliateUser.findUnique({ where: { refCode } })) {
      refCode = genRefCode();
    }
    const aff = await prisma.affiliateUser.create({
      data: { userId: String(user.user_id), email: user.email, refCode },
    });
    res.json(affToDict(aff));
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Admin ───────────────────────────────────────────────
router.get('/admin/list', requireAdmin, async (_req: Request, res: Response) => {
  const affs = await prisma.affiliateUser.findMany({ orderBy: { id: 'desc' } });
  res.json(affs.map(affToDict));
});

router.get('/admin/:aid/referrals', requireAdmin, async (req: Request, res: Response) => {
  const refs = await prisma.affiliateReferral.findMany({
    where: { affiliateId: parseInt(req.params.aid) },
    orderBy: { id: 'desc' },
  });
  res.json(refs.map(refToDict));
});

router.put('/admin/:aid', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { commission_rate, is_active } = req.body;
    const aff = await prisma.affiliateUser.update({
      where: { id: parseInt(req.params.aid) },
      data: {
        ...(commission_rate !== undefined && { commissionRate: commission_rate }),
        ...(is_active !== undefined && { isActive: is_active }),
      },
    });
    res.json(affToDict(aff));
  } catch (e: any) {
    res.status(e.code === 'P2025' ? 404 : 500).json({ detail: e.message });
  }
});

router.put('/admin/referral/:rid/approve', requireAdmin, async (req: Request, res: Response) => {
  try {
    const ref = await prisma.affiliateReferral.findUnique({ where: { id: parseInt(req.params.rid) } });
    if (!ref) { res.status(404).json({ detail: 'Not found' }); return; }
    if (ref.status !== 'pending') { res.status(400).json({ detail: 'Đã xử lý rồi' }); return; }

    await prisma.$transaction([
      prisma.affiliateReferral.update({ where: { id: ref.id }, data: { status: 'approved' } }),
      prisma.affiliateUser.update({
        where: { id: ref.affiliateId },
        data: { totalEarnings: { increment: money(ref.commission) } },
      }),
    ]);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

export default router;
