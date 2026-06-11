/**
 * Huy hiệu thành viên. Mount tại /api.
 *  - GET  /badges            (công khai) — danh sách huy hiệu đang bật
 *  - GET  /badges/me         (user)      — huy hiệu của tôi + tiến độ
 *  - GET/POST/PATCH/DELETE /admin/badges  (admin) — quản lý
 *  - POST /admin/badges/recompute         (admin) — rà soát trao lại toàn bộ
 */
import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireUser, requireAdmin } from '../middleware/auth';
import { evaluateUserBadges } from '../services/badges';

const router = Router();

const pub = (b: any) => ({
  id: b.id, code: b.code, name: b.name, description: b.description,
  icon: b.icon, color: b.color, criteria_type: b.criteriaType,
  threshold: b.threshold != null ? Number(b.threshold) : null,
});

router.get('/badges', async (_req: Request, res: Response) => {
  try {
    const items = await prisma.badge.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
    res.json({ items: items.map(pub) });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.get('/badges/me', requireUser, async (req: Request, res: Response) => {
  try {
    const payload = (req as any).user;
    // Trao kịp thời trước khi trả về.
    await evaluateUserBadges(payload.user_id);
    const mine = await prisma.userBadge.findMany({
      where: { userId: payload.user_id },
      include: { badge: true },
      orderBy: { awardedAt: 'desc' },
    });
    res.json({
      items: mine.map((m: any) => ({ ...pub(m.badge), awarded_at: m.awardedAt })),
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Admin ──────────────────────────────────────────────
router.get('/admin/badges', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const items = await prisma.badge.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { userBadges: true } } },
    });
    res.json({
      items: items.map((b: any) => ({ ...pub(b), is_active: b.isActive, sort_order: b.sortOrder, awarded_count: b._count.userBadges })),
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.post('/admin/badges', requireAdmin, async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    if (!b.code || !b.name) { res.status(400).json({ detail: 'Thiếu code/tên' }); return; }
    const created = await prisma.badge.create({
      data: {
        code: String(b.code).trim(),
        name: String(b.name).trim(),
        description: b.description || null,
        icon: b.icon || null,
        color: b.color || '#00AB55',
        criteriaType: b.criteria_type || null,
        threshold: b.threshold != null && b.threshold !== '' ? Number(b.threshold) : null,
        sortOrder: Number(b.sort_order) || 0,
        isActive: b.is_active !== false,
      },
    });
    res.status(201).json({ id: created.id });
  } catch (e: any) {
    res.status(400).json({ detail: e.message });
  }
});

router.patch('/admin/badges/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const b = req.body || {};
    const data: any = {};
    if (b.name !== undefined) data.name = b.name;
    if (b.description !== undefined) data.description = b.description;
    if (b.icon !== undefined) data.icon = b.icon;
    if (b.color !== undefined) data.color = b.color;
    if (b.criteria_type !== undefined) data.criteriaType = b.criteria_type || null;
    if (b.threshold !== undefined) data.threshold = b.threshold !== '' && b.threshold != null ? Number(b.threshold) : null;
    if (b.sort_order !== undefined) data.sortOrder = Number(b.sort_order) || 0;
    if (b.is_active !== undefined) data.isActive = !!b.is_active;
    await prisma.badge.update({ where: { id }, data });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ detail: e.message });
  }
});

router.delete('/admin/badges/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.badge.delete({ where: { id: parseInt(req.params.id, 10) } });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ detail: e.message });
  }
});

// Rà soát trao lại huy hiệu cho mọi user (chạy nền, trả về ngay).
router.post('/admin/badges/recompute', requireAdmin, async (_req: Request, res: Response) => {
  res.json({ ok: true, message: 'Đang rà soát huy hiệu ở chế độ nền' });
  (async () => {
    try {
      const users = await prisma.user.findMany({ select: { id: true } });
      for (const u of users) {
        // eslint-disable-next-line no-await-in-loop
        await evaluateUserBadges(u.id);
      }
    } catch { /* nuốt lỗi nền */ }
  })();
});

export default router;
