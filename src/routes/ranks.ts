/**
 * Cấp bậc thành viên. Mount tại /api.
 *  - GET  /ranks           (công khai) — danh sách hạng (để hiển thị bảng đặc quyền)
 *  - GET  /ranks/me        (user)      — hạng hiện tại + tiến độ lên hạng kế
 *  - admin: GET/POST/PATCH/DELETE /admin/ranks, POST /admin/ranks/recompute
 *  - admin: gán hạng tay /admin/users/:id/rank
 */
import { Router, Request, Response } from 'express';
import prisma from '../db';
import slugify from 'slugify';
import { requireUser, requireAdmin } from '../middleware/auth';
import { rankToDict, evaluateUserRank, getDefaultRank, money } from '../services/ranks';

const router = Router();

router.get('/ranks', async (_req: Request, res: Response) => {
  try {
    const ranks = await prisma.userRank.findMany({ where: { isActive: true }, orderBy: { level: 'asc' } });
    res.json({ items: ranks.map(rankToDict) });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.get('/ranks/me', requireUser, async (req: Request, res: Response) => {
  try {
    const payload = (req as any).user;
    await evaluateUserRank(payload.user_id);
    const user = await prisma.user.findUnique({ where: { id: payload.user_id }, include: { rank: true } });
    const ranks = await prisma.userRank.findMany({ where: { isActive: true }, orderBy: { level: 'asc' } });
    const current = (user as any)?.rank;
    // Hạng kế tiếp (level cao hơn current, theo tiêu chí tự động).
    const next = ranks.find((r: any) => r.level > (current?.level ?? -1) && r.requirementType !== 'manual');
    const spent = money(user?.totalSpent);
    res.json({
      current: current ? rankToDict(current) : null,
      total_spent: spent,
      points: user?.points || 0,
      next: next
        ? {
            ...rankToDict(next),
            progress: next.requirementType === 'points'
              ? Math.min(100, Math.round(((user?.points || 0) / Math.max(1, money(next.threshold))) * 100))
              : Math.min(100, Math.round((spent / Math.max(1, money(next.threshold))) * 100)),
          }
        : null,
      ranks: ranks.map(rankToDict),
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Admin ──────────────────────────────────────────────
router.get('/admin/ranks', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const ranks = await prisma.userRank.findMany({
      orderBy: { level: 'asc' },
      include: { _count: { select: { users: true } } },
    });
    res.json({ items: ranks.map((r: any) => ({ ...rankToDict(r), user_count: r._count.users })) });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.post('/admin/ranks', requireAdmin, async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    if (!b.name) { res.status(400).json({ detail: 'Thiếu tên hạng' }); return; }
    const slug = slugify(String(b.name), { lower: true, strict: true }) || `rank-${Date.now()}`;
    if (b.is_default) await prisma.userRank.updateMany({ data: { isDefault: false } });
    const r = await prisma.userRank.create({
      data: {
        name: b.name, slug,
        level: Number(b.level) || 0,
        color: b.color || '#00AB55',
        icon: b.icon || null,
        sparkle: !!b.sparkle,
        highlightName: !!b.highlight_name,
        requirementType: b.requirement_type || 'manual',
        threshold: b.threshold != null && b.threshold !== '' ? Number(b.threshold) : 0,
        discountPercent: b.discount_percent != null && b.discount_percent !== '' ? Number(b.discount_percent) : 0,
        orderPriority: !!b.order_priority,
        supportPriority: !!b.support_priority,
        isActive: b.is_active !== false,
        isDefault: !!b.is_default,
      },
    });
    res.status(201).json({ id: r.id });
  } catch (e: any) {
    res.status(400).json({ detail: e.message });
  }
});

router.patch('/admin/ranks/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const b = req.body || {};
    if (b.is_default) await prisma.userRank.updateMany({ data: { isDefault: false } });
    const data: any = {};
    if (b.name !== undefined) data.name = b.name;
    if (b.level !== undefined) data.level = Number(b.level) || 0;
    if (b.color !== undefined) data.color = b.color;
    if (b.icon !== undefined) data.icon = b.icon || null;
    if (b.sparkle !== undefined) data.sparkle = !!b.sparkle;
    if (b.highlight_name !== undefined) data.highlightName = !!b.highlight_name;
    if (b.requirement_type !== undefined) data.requirementType = b.requirement_type;
    if (b.threshold !== undefined) data.threshold = b.threshold !== '' && b.threshold != null ? Number(b.threshold) : 0;
    if (b.discount_percent !== undefined) data.discountPercent = b.discount_percent !== '' && b.discount_percent != null ? Number(b.discount_percent) : 0;
    if (b.order_priority !== undefined) data.orderPriority = !!b.order_priority;
    if (b.support_priority !== undefined) data.supportPriority = !!b.support_priority;
    if (b.is_active !== undefined) data.isActive = !!b.is_active;
    if (b.is_default !== undefined) data.isDefault = !!b.is_default;
    await prisma.userRank.update({ where: { id }, data });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ detail: e.message });
  }
});

router.delete('/admin/ranks/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.user.updateMany({ where: { rankId: id }, data: { rankId: null } });
    await prisma.userRank.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ detail: e.message });
  }
});

// Gán hạng tay cho 1 user (khóa tự động).
router.post('/admin/users/:id/rank', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const rankId = req.body?.rank_id ? parseInt(req.body.rank_id, 10) : null;
    const locked = req.body?.locked !== false; // mặc định khóa khi gán tay
    await prisma.user.update({ where: { id }, data: { rankId, rankLockedManual: rankId ? locked : false } });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ detail: e.message });
  }
});

router.post('/admin/ranks/recompute', requireAdmin, async (_req: Request, res: Response) => {
  res.json({ ok: true, message: 'Đang rà soát hạng ở chế độ nền' });
  (async () => {
    try {
      const def = await getDefaultRank();
      const users = await prisma.user.findMany({ where: { rankLockedManual: false }, select: { id: true, rankId: true } });
      for (const u of users) {
        // eslint-disable-next-line no-await-in-loop
        await evaluateUserRank(u.id);
        if (def && !u.rankId) {
          // eslint-disable-next-line no-await-in-loop
          await prisma.user.update({ where: { id: u.id }, data: { rankId: def.id } }).catch(() => {});
        }
      }
    } catch { /* nuốt lỗi nền */ }
  })();
});

// ── Giá theo hạng cho từng gói (RankPrice) ─────────────
router.get('/admin/packages/:id/rank-prices', requireAdmin, async (req: Request, res: Response) => {
  try {
    const packageId = parseInt(req.params.id, 10);
    const rows = await prisma.rankPrice.findMany({ where: { packageId } });
    res.json({
      items: rows.map((r: any) => ({
        id: r.id, rank_id: r.rankId, price_type: r.priceType,
        discount_percent: r.discountPercent != null ? money(r.discountPercent) : null,
        fixed_price: r.fixedPrice != null ? money(r.fixedPrice) : null,
      })),
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.put('/admin/packages/:id/rank-prices', requireAdmin, async (req: Request, res: Response) => {
  try {
    const packageId = parseInt(req.params.id, 10);
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    await prisma.rankPrice.deleteMany({ where: { packageId } });
    for (const it of items) {
      if (!it.rank_id) continue;
      // eslint-disable-next-line no-await-in-loop
      await prisma.rankPrice.create({
        data: {
          packageId,
          rankId: Number(it.rank_id),
          priceType: it.price_type === 'fixed' ? 'fixed' : 'percent',
          discountPercent: it.price_type !== 'fixed' && it.discount_percent != null && it.discount_percent !== '' ? Number(it.discount_percent) : null,
          fixedPrice: it.price_type === 'fixed' && it.fixed_price != null && it.fixed_price !== '' ? Number(it.fixed_price) : null,
        },
      }).catch(() => {});
    }
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ detail: e.message });
  }
});

export default router;
