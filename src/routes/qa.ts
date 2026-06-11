/**
 * Hỏi & Đáp sản phẩm. Mount tại /api.
 *  - GET  /products/:id/questions          (công khai) — câu hỏi đã hiển thị
 *  - POST /products/:id/questions          (user)      — đặt câu hỏi
 *  - GET  /admin/questions                 (staff)     — tất cả câu hỏi
 *  - POST /admin/questions/:id/answer      (staff)     — trả lời
 *  - PATCH/DELETE /admin/questions/:id      (staff)     — ẩn/xoá
 */
import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireUser, requireStaffOrAdmin } from '../middleware/auth';
import { createNotification } from '../services/notify';

const router = Router();

router.get('/products/:id/questions', async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.id, 10);
    if (!Number.isInteger(productId)) { res.json({ items: [] }); return; }
    const items = await prisma.productQuestion.findMany({
      where: { productId, isVisible: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({
      items: items.map((q: any) => ({
        id: q.id,
        user_name: q.userName || 'Khách',
        question: q.question,
        answer: q.answer,
        answered_by: q.answeredBy,
        answered_at: q.answeredAt,
        created_at: q.createdAt,
      })),
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.post('/products/:id/questions', requireUser, async (req: Request, res: Response) => {
  try {
    const payload = (req as any).user;
    const productId = parseInt(req.params.id, 10);
    const question = String(req.body?.question || '').trim();
    if (!question) { res.status(400).json({ detail: 'Nội dung câu hỏi trống' }); return; }
    if (question.length > 1000) { res.status(400).json({ detail: 'Câu hỏi quá dài' }); return; }
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) { res.status(404).json({ detail: 'Không tìm thấy sản phẩm' }); return; }
    const q = await prisma.productQuestion.create({
      data: {
        productId,
        userId: payload.user_id,
        userName: payload.display_name || payload.email?.split('@')[0] || 'Khách',
        question,
      },
    });
    res.status(201).json({ id: q.id, ok: true });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Admin/Staff ────────────────────────────────────────
router.get('/admin/questions', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const filter = String(req.query.filter || 'all'); // all | unanswered
    const where: any = {};
    if (filter === 'unanswered') where.answer = null;
    const items = await prisma.productQuestion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 300,
      include: { product: { select: { name: true, slug: true } } },
    });
    res.json({
      items: items.map((q: any) => ({
        id: q.id,
        product_id: q.productId,
        product_name: q.product?.name,
        product_slug: q.product?.slug,
        user_name: q.userName,
        question: q.question,
        answer: q.answer,
        answered_by: q.answeredBy,
        answered_at: q.answeredAt,
        is_visible: q.isVisible,
        created_at: q.createdAt,
      })),
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.post('/admin/questions/:id/answer', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).admin;
    const id = parseInt(req.params.id, 10);
    const answer = String(req.body?.answer || '').trim();
    if (!answer) { res.status(400).json({ detail: 'Nội dung trả lời trống' }); return; }
    const q = await prisma.productQuestion.update({
      where: { id },
      data: { answer, answeredBy: admin?.display_name || 'Hỗ trợ', answeredAt: new Date() },
    });
    // Báo cho người hỏi.
    createNotification(q.userId, {
      type: 'system',
      title: 'Câu hỏi của bạn đã được trả lời',
      body: answer.slice(0, 140),
      link: q.productId ? `/dashboard/e-commerce/product/${q.productId}` : '/',
    }).catch(() => {});
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.patch('/admin/questions/:id', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data: any = {};
    if (typeof req.body?.is_visible === 'boolean') data.isVisible = req.body.is_visible;
    if (typeof req.body?.answer === 'string') data.answer = req.body.answer;
    await prisma.productQuestion.update({ where: { id }, data });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.delete('/admin/questions/:id', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.productQuestion.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

export default router;
