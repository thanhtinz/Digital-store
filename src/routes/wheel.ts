/**
 * Vòng quay may mắn. Mount tại /api/wheel.
 * Cấu hình (site_config): wheel_enabled, wheel_cost_points, wheel_free_daily.
 *  - GET  /config            — trạng thái + phần thưởng (để vẽ vòng quay)
 *  - POST /spin              — quay (trừ điểm hoặc dùng lượt free trong ngày)
 *  - GET  /history           — lịch sử quay của tôi
 *  - admin: GET/POST/PATCH/DELETE /admin/prizes
 */
import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireUser, requireAdmin } from '../middleware/auth';
import { createNotification } from '../services/notify';

const router = Router();

async function getConfig() {
  const rows = await prisma.siteConfig.findMany({
    where: { key: { in: ['wheel_enabled', 'wheel_cost_points', 'wheel_free_daily'] } },
  });
  const m = Object.fromEntries(rows.map((r: any) => [r.key, r.value || '']));
  return {
    enabled: m['wheel_enabled'] === '1' || m['wheel_enabled'] === 'true',
    costPoints: parseInt(m['wheel_cost_points'] || '0', 10) || 0,
    freeDaily: parseInt(m['wheel_free_daily'] || '0', 10) || 0,
  };
}

function todayVN(): string {
  return new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
}

async function freeSpinsUsedToday(userId: number): Promise<number> {
  const start = new Date(`${todayVN()}T00:00:00.000Z`);
  start.setUTCHours(start.getUTCHours() - 7); // 00:00 giờ VN → UTC
  return prisma.wheelSpin.count({ where: { userId, costPoints: 0, createdAt: { gte: start } } });
}

router.get('/config', requireUser, async (req: Request, res: Response) => {
  try {
    const payload = (req as any).user;
    const cfg = await getConfig();
    const prizes = await prisma.wheelPrize.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
    const user = await prisma.user.findUnique({ where: { id: payload.user_id } });
    const usedFree = await freeSpinsUsedToday(payload.user_id);
    const freeLeft = Math.max(0, cfg.freeDaily - usedFree);
    res.json({
      enabled: cfg.enabled,
      cost_points: cfg.costPoints,
      free_daily: cfg.freeDaily,
      free_left: freeLeft,
      my_points: user?.points || 0,
      can_spin: cfg.enabled && (freeLeft > 0 || (cfg.costPoints > 0 && (user?.points || 0) >= cfg.costPoints)),
      prizes: prizes.map((p: any) => ({ id: p.id, label: p.label, color: p.color, type: p.type })),
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.post('/spin', requireUser, async (req: Request, res: Response) => {
  try {
    const payload = (req as any).user;
    const uid = payload.user_id;
    const cfg = await getConfig();
    if (!cfg.enabled) { res.status(400).json({ detail: 'Vòng quay đang tắt' }); return; }

    const usedFree = await freeSpinsUsedToday(uid);
    const freeLeft = Math.max(0, cfg.freeDaily - usedFree);
    const useFree = freeLeft > 0;
    const cost = useFree ? 0 : cfg.costPoints;

    const user = await prisma.user.findUnique({ where: { id: uid } });
    if (!user) { res.status(404).json({ detail: 'User not found' }); return; }
    if (!useFree) {
      if (cost <= 0) { res.status(400).json({ detail: 'Đã hết lượt quay miễn phí hôm nay' }); return; }
      if (user.points < cost) { res.status(400).json({ detail: 'Không đủ điểm để quay' }); return; }
    }

    const prizes = await prisma.wheelPrize.findMany({ where: { isActive: true } });
    const avail = prizes.filter((p: any) => p.stock < 0 || p.wonCount < p.stock);
    if (!avail.length) { res.status(400).json({ detail: 'Hết phần thưởng' }); return; }

    // Random theo trọng số.
    const totalWeight = avail.reduce((s: number, p: any) => s + Math.max(1, p.weight), 0);
    let r = Math.random() * totalWeight;
    let prize: any = avail[avail.length - 1];
    for (const p of avail) {
      r -= Math.max(1, p.weight);
      if (r <= 0) { prize = p; break; }
    }

    // Áp dụng kết quả trong transaction.
    await prisma.$transaction(async (tx: any) => {
      if (cost > 0) {
        const after = user.points - cost;
        await tx.user.update({ where: { id: uid }, data: { points: after } });
        await tx.pointTransaction.create({
          data: { userId: uid, amount: -cost, balanceAfter: after, type: 'wheel_spin', description: 'Quay may mắn' },
        });
      }
      // Cộng thưởng
      const val = Number(prize.value || 0);
      if (prize.type === 'points' && val > 0) {
        const cur = await tx.user.findUnique({ where: { id: uid } });
        const after = (cur?.points || 0) + val;
        await tx.user.update({ where: { id: uid }, data: { points: after } });
        await tx.pointTransaction.create({
          data: { userId: uid, amount: val, balanceAfter: after, type: 'wheel_prize', description: `Trúng: ${prize.label}` },
        });
      } else if (prize.type === 'balance' && val > 0) {
        const cur = await tx.user.findUnique({ where: { id: uid } });
        const after = Number(cur?.balance || 0) + val;
        await tx.user.update({ where: { id: uid }, data: { balance: after } });
        await tx.balanceTransaction.create({
          data: { userId: uid, amount: val, balanceAfter: after, type: 'reward', description: `Vòng quay: ${prize.label}` },
        });
      }
      await tx.wheelPrize.update({ where: { id: prize.id }, data: { wonCount: { increment: 1 } } });
      await tx.wheelSpin.create({
        data: { userId: uid, prizeId: prize.id, prizeLabel: prize.label, type: prize.type, value: prize.value, costPoints: cost },
      });
    });

    if (prize.type !== 'none') {
      createNotification(uid, { type: 'points', title: `🎉 Vòng quay: ${prize.label}`, link: '/dashboard/wheel' }).catch(() => {});
    }

    res.json({
      ok: true,
      prize: { id: prize.id, label: prize.label, type: prize.type, value: Number(prize.value || 0), voucher_code: prize.type === 'voucher' ? prize.voucherCode : undefined },
      used_free: useFree,
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.get('/history', requireUser, async (req: Request, res: Response) => {
  try {
    const payload = (req as any).user;
    const items = await prisma.wheelSpin.findMany({
      where: { userId: payload.user_id }, orderBy: { createdAt: 'desc' }, take: 50,
    });
    res.json({
      items: items.map((s: any) => ({
        id: s.id, prize_label: s.prizeLabel, type: s.type, value: Number(s.value || 0),
        cost_points: s.costPoints, created_at: s.createdAt,
      })),
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Admin: quản lý phần thưởng ─────────────────────────
router.get('/admin/prizes', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const items = await prisma.wheelPrize.findMany({ orderBy: { sortOrder: 'asc' } });
    res.json({
      items: items.map((p: any) => ({
        id: p.id, label: p.label, type: p.type, value: Number(p.value || 0),
        voucher_code: p.voucherCode, weight: p.weight, color: p.color,
        stock: p.stock, won_count: p.wonCount, is_active: p.isActive, sort_order: p.sortOrder,
      })),
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.post('/admin/prizes', requireAdmin, async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    if (!b.label) { res.status(400).json({ detail: 'Thiếu nhãn' }); return; }
    const created = await prisma.wheelPrize.create({
      data: {
        label: String(b.label).slice(0, 120),
        type: b.type || 'points',
        value: Number(b.value) || 0,
        voucherCode: b.voucher_code || null,
        weight: Number(b.weight) || 1,
        color: b.color || '#00AB55',
        stock: b.stock != null && b.stock !== '' ? Number(b.stock) : -1,
        isActive: b.is_active !== false,
        sortOrder: Number(b.sort_order) || 0,
      },
    });
    res.status(201).json({ id: created.id });
  } catch (e: any) {
    res.status(400).json({ detail: e.message });
  }
});

router.patch('/admin/prizes/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const b = req.body || {};
    const data: any = {};
    if (b.label !== undefined) data.label = String(b.label).slice(0, 120);
    if (b.type !== undefined) data.type = b.type;
    if (b.value !== undefined) data.value = Number(b.value) || 0;
    if (b.voucher_code !== undefined) data.voucherCode = b.voucher_code || null;
    if (b.weight !== undefined) data.weight = Number(b.weight) || 1;
    if (b.color !== undefined) data.color = b.color;
    if (b.stock !== undefined) data.stock = b.stock !== '' && b.stock != null ? Number(b.stock) : -1;
    if (b.is_active !== undefined) data.isActive = !!b.is_active;
    if (b.sort_order !== undefined) data.sortOrder = Number(b.sort_order) || 0;
    await prisma.wheelPrize.update({ where: { id }, data });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ detail: e.message });
  }
});

router.delete('/admin/prizes/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.wheelPrize.delete({ where: { id: parseInt(req.params.id, 10) } });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ detail: e.message });
  }
});

export default router;
