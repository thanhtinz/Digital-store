/**
 * User notifications (chuông trong app).
 * Mount tại /api/notifications.
 */
import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireUser } from '../middleware/auth';

const router = Router();

function toDict(n: any) {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    is_read: n.isRead,
    created_at: n.createdAt?.toISOString(),
  };
}

// Danh sách thông báo + số chưa đọc
router.get('/', requireUser, async (req: Request, res: Response) => {
  try {
    const uid = (req as any).user.user_id;
    const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);
    const [items, unread] = await Promise.all([
      prisma.notification.findMany({ where: { userId: uid }, orderBy: { id: 'desc' }, take: limit }),
      prisma.notification.count({ where: { userId: uid, isRead: false } }),
    ]);
    res.json({ items: items.map(toDict), unread_count: unread });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// Số chưa đọc (poll nhẹ cho chuông)
router.get('/unread-count', requireUser, async (req: Request, res: Response) => {
  try {
    const uid = (req as any).user.user_id;
    const unread = await prisma.notification.count({ where: { userId: uid, isRead: false } });
    res.json({ unread_count: unread });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// Đánh dấu đã đọc 1 thông báo
router.post('/:id/read', requireUser, async (req: Request, res: Response) => {
  try {
    const uid = (req as any).user.user_id;
    await prisma.notification.updateMany({
      where: { id: parseInt(req.params.id), userId: uid },
      data: { isRead: true },
    });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// Đánh dấu đã đọc tất cả
router.post('/read-all', requireUser, async (req: Request, res: Response) => {
  try {
    const uid = (req as any).user.user_id;
    await prisma.notification.updateMany({ where: { userId: uid, isRead: false }, data: { isRead: true } });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

export default router;
