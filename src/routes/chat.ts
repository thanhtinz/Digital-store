/**
 * Live chat tự xây — quản lý trong admin.
 * Mount tại /api/chat.
 *
 * Phía user: yêu cầu đăng nhập (gắn theo userId, an toàn, không lộ hội thoại).
 * Phía admin: liệt kê/đọc/trả lời/đóng hội thoại.
 * Realtime kiểu poll nhẹ (GET /poll, GET /admin/.../poll).
 */
import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireUser, requireStaffOrAdmin } from '../middleware/auth';
import { createNotification } from '../services/notify';

const router = Router();

function msgDict(m: any) {
  return { id: m.id, sender: m.sender, body: m.body, created_at: m.createdAt?.toISOString() };
}

// ── USER ───────────────────────────────────────────────
async function getOrCreateConversation(uid: number, email?: string) {
  let conv = await prisma.chatConversation.findFirst({ where: { userId: uid, status: 'open' }, orderBy: { id: 'desc' } });
  if (!conv) {
    conv = await prisma.chatConversation.create({ data: { userId: uid, guestEmail: email || null } });
  }
  return conv;
}

// Lấy hội thoại hiện tại + tin nhắn
router.get('/my', requireUser, async (req: Request, res: Response) => {
  try {
    const uid = (req as any).user.user_id;
    const conv = await getOrCreateConversation(uid, (req as any).user.email);
    const messages = await prisma.chatMessage.findMany({ where: { conversationId: conv.id }, orderBy: { id: 'asc' }, take: 200 });
    // đánh dấu user đã đọc
    if (conv.unreadUser > 0) await prisma.chatConversation.update({ where: { id: conv.id }, data: { unreadUser: 0 } });
    res.json({ conversation_id: conv.id, status: conv.status, messages: messages.map(msgDict) });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// Gửi tin nhắn
router.post('/send', requireUser, async (req: Request, res: Response) => {
  try {
    const uid = (req as any).user.user_id;
    const body = String(req.body.message || '').trim();
    if (!body) { res.status(400).json({ detail: 'Nội dung trống' }); return; }
    if (body.length > 4000) { res.status(400).json({ detail: 'Tin nhắn quá dài' }); return; }
    const conv = await getOrCreateConversation(uid, (req as any).user.email);
    const msg = await prisma.chatMessage.create({ data: { conversationId: conv.id, sender: 'user', body } });
    await prisma.chatConversation.update({
      where: { id: conv.id },
      data: { lastMessageAt: new Date(), unreadAdmin: { increment: 1 }, status: 'open' },
    });
    res.json({ ok: true, message: msgDict(msg), conversation_id: conv.id });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// Poll tin nhắn mới (sau messageId)
router.get('/poll', requireUser, async (req: Request, res: Response) => {
  try {
    const uid = (req as any).user.user_id;
    const after = parseInt(req.query.after as string) || 0;
    const conv = await prisma.chatConversation.findFirst({ where: { userId: uid, status: 'open' }, orderBy: { id: 'desc' } });
    if (!conv) { res.json({ messages: [], unread: 0 }); return; }
    const messages = await prisma.chatMessage.findMany({
      where: { conversationId: conv.id, id: { gt: after } }, orderBy: { id: 'asc' }, take: 100,
    });
    if (messages.some((m: any) => m.sender === 'admin') && conv.unreadUser > 0) {
      await prisma.chatConversation.update({ where: { id: conv.id }, data: { unreadUser: 0 } });
    }
    res.json({ messages: messages.map(msgDict), unread: conv.unreadUser });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── ADMIN ──────────────────────────────────────────────
router.get('/admin/conversations', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const status = (req.query.status as string) || 'open';
    const where: any = status === 'all' ? {} : { status };
    const convs = await prisma.chatConversation.findMany({
      where, orderBy: { lastMessageAt: 'desc' }, take: 100,
      include: { messages: { orderBy: { id: 'desc' }, take: 1 } },
    });
    const userIds = convs.map((c: any) => c.userId).filter((x: any): x is number => !!x);
    const users = userIds.length ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true, displayName: true } }) : [];
    const umap: Record<number, any> = Object.fromEntries(users.map((u: any) => [u.id, u]));
    res.json({
      items: convs.map((c: any) => ({
        id: c.id,
        user_id: c.userId,
        user_email: c.userId ? umap[c.userId]?.email : c.guestEmail,
        user_name: c.userId ? (umap[c.userId]?.displayName || umap[c.userId]?.email) : (c.guestName || 'Khách'),
        status: c.status,
        unread_admin: c.unreadAdmin,
        last_message: c.messages[0]?.body || '',
        last_message_at: c.lastMessageAt?.toISOString(),
      })),
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// Tổng số tin chưa đọc (badge admin)
router.get('/admin/unread-total', requireStaffOrAdmin, async (_req: Request, res: Response) => {
  try {
    const agg = await prisma.chatConversation.aggregate({ _sum: { unreadAdmin: true }, where: { status: 'open' } });
    res.json({ unread_total: agg._sum.unreadAdmin || 0 });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.get('/admin/conversations/:id', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const conv = await prisma.chatConversation.findUnique({ where: { id } });
    if (!conv) { res.status(404).json({ detail: 'Không tìm thấy' }); return; }
    const messages = await prisma.chatMessage.findMany({ where: { conversationId: id }, orderBy: { id: 'asc' }, take: 500 });
    if (conv.unreadAdmin > 0) await prisma.chatConversation.update({ where: { id }, data: { unreadAdmin: 0 } });
    res.json({ id, status: conv.status, user_id: conv.userId, messages: messages.map(msgDict) });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.post('/admin/conversations/:id/reply', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const body = String(req.body.message || '').trim();
    if (!body) { res.status(400).json({ detail: 'Nội dung trống' }); return; }
    const conv = await prisma.chatConversation.findUnique({ where: { id } });
    if (!conv) { res.status(404).json({ detail: 'Không tìm thấy' }); return; }
    const msg = await prisma.chatMessage.create({ data: { conversationId: id, sender: 'admin', body } });
    await prisma.chatConversation.update({
      where: { id }, data: { lastMessageAt: new Date(), unreadUser: { increment: 1 }, unreadAdmin: 0 },
    });
    if (conv.userId) {
      createNotification(conv.userId, { type: 'system', title: 'Bạn có tin nhắn hỗ trợ mới', body: body.slice(0, 80), link: '/?chat=1' }).catch(() => {});
    }
    res.json({ ok: true, message: msgDict(msg) });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.post('/admin/conversations/:id/close', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.chatConversation.update({ where: { id: parseInt(req.params.id) }, data: { status: 'closed' } });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

export default router;
