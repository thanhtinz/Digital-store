import { Router, Request, Response } from 'express';
import slugify from 'slugify';
import multer from 'multer';
import sharp from 'sharp';
import prisma from '../db';
import { requireUser, requireStaffOrAdmin, optionalUser } from '../middleware/auth';

const router = Router();
const uploadReviewImage = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

// ════════════════════════════════════════════════════
// SEARCH
// ════════════════════════════════════════════════════

router.get('/search', async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || '';
    if (!q.trim()) { res.json({ products: [], categories: [] }); return; }

    const [products, categories] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true, name: { contains: q, mode: 'insensitive' } },
        take: 10,
        include: { packages: { where: { isActive: true }, take: 1, orderBy: { price: 'asc' } } },
      }),
      prisma.category.findMany({
        where: { isActive: true, name: { contains: q, mode: 'insensitive' } },
        take: 5,
      }),
    ]);
    res.json({ products, categories });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ════════════════════════════════════════════════════
// BLOG
// ════════════════════════════════════════════════════

router.get('/blog/posts', async (req: Request, res: Response) => {
  try {
    const { category, page = '1', limit = '10' } = req.query;
    const where: any = { isPublished: true };
    if (category) where.category = { slug: category };

    const [total, posts] = await Promise.all([
      prisma.blogPost.count({ where }),
      prisma.blogPost.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
        select: {
          id: true, title: true, slug: true, excerpt: true, thumbnailUrl: true,
          publishedAt: true, viewCount: true, category: true,
          metaTitle: true, metaDescription: true,
        } as any,
      }),
    ]);
    res.json({ total, page: parseInt(page as string), items: posts });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.get('/blog/posts/search', async (req: Request, res: Response) => {
  try {
    const query = ((req.query.query as string) || (req.query.q as string) || '').trim();
    if (!query) { res.json({ results: [] }); return; }
    const posts = await prisma.blogPost.findMany({
      where: {
        isPublished: true,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { excerpt: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { publishedAt: 'desc' },
      take: 10,
      select: {
        id: true, title: true, slug: true, excerpt: true, thumbnailUrl: true,
        publishedAt: true, viewCount: true, category: true,
      } as any,
    });
    res.json({ results: posts });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.get('/blog/posts/:slug', async (req: Request, res: Response) => {
  try {
    const post = await prisma.blogPost.findFirst({
      where: { slug: req.params.slug, isPublished: true },
      include: { category: true },
    });
    if (!post) { res.status(404).json({ detail: 'Không tìm thấy bài viết' }); return; }
    await prisma.blogPost.update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } });
    res.json(post);
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.post(['/admin/blog/posts', '/blog/admin/posts'], requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const { title, content, excerpt, category_id, thumbnail_url, meta_title, meta_description, is_published } = req.body;
    const admin = (req as any).admin;
    const slug = slugify(title, { lower: true, strict: true });
    const post = await prisma.blogPost.create({
      data: {
        title, slug, content, excerpt: excerpt || null,
        categoryId: category_id || null,
        thumbnailUrl: thumbnail_url || null,
        metaTitle: meta_title || null, metaDescription: meta_description || null,
        isPublished: is_published || false,
        publishedAt: is_published ? new Date() : null,
        authorId: admin?.user_id?.toString(),
      },
    });
    res.status(201).json(post);
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.patch(['/admin/blog/posts/:id', '/blog/admin/posts/:id'], requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const { title, content, excerpt, category_id, thumbnail_url, is_published } = req.body;
    const post = await prisma.blogPost.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(title && { title }),
        ...(content && { content }),
        ...(excerpt !== undefined && { excerpt }),
        ...(category_id !== undefined && { categoryId: category_id }),
        ...(thumbnail_url !== undefined && { thumbnailUrl: thumbnail_url }),
        ...(is_published !== undefined && {
          isPublished: is_published,
          publishedAt: is_published ? new Date() : null,
        }),
      },
    });
    res.json(post);
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.delete(['/admin/blog/posts/:id', '/blog/admin/posts/:id'], requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.blogPost.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Đã xóa bài viết' });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// Admin: TẤT CẢ bài viết (gồm bản nháp) cho màn quản trị
router.get(['/admin/blog/posts/all', '/blog/admin/posts/all'], requireStaffOrAdmin, async (_req: Request, res: Response) => {
  try {
    const posts = await prisma.blogPost.findMany({ orderBy: { createdAt: 'desc' }, include: { category: true } });
    res.json({
      items: posts.map((p: any) => ({
        id: p.id, title: p.title, slug: p.slug, excerpt: p.excerpt, thumbnailUrl: p.thumbnailUrl,
        isPublished: p.isPublished, viewCount: p.viewCount,
        category: p.category ? { id: p.category.id, name: p.category.name } : null,
        categoryId: p.categoryId,
        createdAt: p.createdAt?.toISOString(), publishedAt: p.publishedAt?.toISOString(),
      })),
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// Admin: chi tiết 1 bài (kèm nội dung) để sửa
router.get(['/admin/blog/posts/id/:id', '/blog/admin/posts/id/:id'], requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const p = await prisma.blogPost.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!p) { res.status(404).json({ detail: 'Không tìm thấy' }); return; }
    res.json(p);
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ════════════════════════════════════════════════════
// REVIEWS
// ════════════════════════════════════════════════════

router.get(['/products/:productId/reviews', '/reviews/product/:productId'], async (req: Request, res: Response) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { productId: parseInt(req.params.productId), isVisible: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const avg = reviews.length ? reviews.reduce((a: number, b: { rating: number }) => a + b.rating, 0) / reviews.length : 0;
    res.json({ reviews, average: avg.toFixed(1), total: reviews.length });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.post('/reviews', requireUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { rating, comment, product_id } = req.body;
    const productId = parseInt(product_id);
    if (!productId) { res.status(422).json({ detail: 'Thiếu product_id' }); return; }
    if (!rating || rating < 1 || rating > 5) {
      res.status(422).json({ detail: 'Rating phải từ 1-5' });
      return;
    }
    const existing = await prisma.review.findFirst({
      where: { productId, userId: user.user_id.toString() },
    });
    if (existing) {
      res.status(400).json({ detail: 'Bạn đã đánh giá sản phẩm này rồi' });
      return;
    }
    const images = Array.isArray(req.body.images) ? req.body.images.filter((x: any) => typeof x === 'string').slice(0, 6) : [];
    const review = await prisma.review.create({
      data: {
        productId,
        userId: user.user_id.toString(),
        userName: user.display_name || user.email,
        rating, comment: comment || null,
        images: images.length ? images : undefined,
      },
    });
    res.status(201).json(review);
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// Upload ảnh cho đánh giá (khách đã đăng nhập). Lưu vào uploaded_images, trả URL.
router.post('/reviews/upload-image', requireUser, uploadReviewImage.single('file'), async (req: Request, res: Response) => {
  try {
    const f = (req as any).file;
    if (!f || !f.buffer) { res.status(400).json({ detail: 'Thiếu file ảnh' }); return; }
    let data: Buffer = f.buffer;
    let mime = f.mimetype || 'image/jpeg';
    const isGif = (f.mimetype || '').includes('gif');
    try {
      if (isGif) {
        data = await sharp(f.buffer, { animated: true }).resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
      } else {
        data = await sharp(f.buffer).rotate().resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
      }
      mime = 'image/webp';
    } catch {
      data = f.buffer;
      mime = f.mimetype || 'image/jpeg';
    }
    const img = await prisma.uploadedImage.create({ data: { filename: f.originalname || null, data, mimeType: mime } });
    res.status(201).json({ url: `/api/images/${img.id}` });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// Bấm "hữu ích" cho đánh giá (toggle, chống trùng).
router.post('/reviews/:id/helpful', requireUser, async (req: Request, res: Response) => {
  try {
    const reviewId = parseInt(req.params.id);
    const userId = (req as any).user.user_id.toString();
    const existing = await prisma.reviewHelpful.findUnique({ where: { reviewId_userId: { reviewId, userId } } });
    let voted: boolean;
    if (existing) {
      await prisma.$transaction([
        prisma.reviewHelpful.delete({ where: { id: existing.id } }),
        prisma.review.update({ where: { id: reviewId }, data: { helpfulCount: { decrement: 1 } } }),
      ]);
      voted = false;
    } else {
      await prisma.$transaction([
        prisma.reviewHelpful.create({ data: { reviewId, userId } }),
        prisma.review.update({ where: { id: reviewId }, data: { helpfulCount: { increment: 1 } } }),
      ]);
      voted = true;
    }
    const r = await prisma.review.findUnique({ where: { id: reviewId }, select: { helpfulCount: true } });
    res.json({ ok: true, voted, helpful_count: Math.max(0, r?.helpfulCount || 0) });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Admin: kiểm duyệt đánh giá ─────────────────────────
router.get('/admin/reviews', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);
    const where: any = {};
    if (req.query.visible === 'true') where.isVisible = true;
    if (req.query.visible === 'false') where.isVisible = false;
    const [total, reviews] = await Promise.all([
      prisma.review.count({ where }),
      prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { product: { select: { name: true } } },
      }),
    ]);
    res.json({
      total,
      page,
      items: reviews.map((r: any) => ({
        id: r.id,
        product_id: r.productId,
        product_name: r.product?.name,
        user_name: r.userName,
        rating: r.rating,
        comment: r.comment,
        is_visible: r.isVisible,
        created_at: r.createdAt?.toISOString(),
      })),
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.patch('/admin/reviews/:id', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const r = await prisma.review.update({
      where: { id: parseInt(req.params.id) },
      data: { ...(req.body.is_visible !== undefined && { isVisible: req.body.is_visible }) },
    });
    res.json({ id: r.id, is_visible: r.isVisible });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.delete('/admin/reviews/:id', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.review.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ════════════════════════════════════════════════════
// WISHLIST
// ════════════════════════════════════════════════════

router.get('/wishlist', requireUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const items = await prisma.wishlist.findMany({
      where: { userId: user.user_id.toString() },
      include: { product: { include: { packages: { where: { isActive: true }, take: 1, orderBy: { price: 'asc' } } } } },
    });
    res.json(items.map((i: any) => i.product));
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.post('/wishlist/:productId', requireUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const productId = parseInt(req.params.productId);
    const existing = await prisma.wishlist.findFirst({ where: { userId: user.user_id.toString(), productId } });
    if (existing) {
      await prisma.wishlist.delete({ where: { id: existing.id } });
      res.json({ wishlisted: false });
    } else {
      await prisma.wishlist.create({ data: { userId: user.user_id.toString(), productId } });
      res.json({ wishlisted: true });
    }
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ════════════════════════════════════════════════════
// SUPPORT TICKETS (user)
// ════════════════════════════════════════════════════

router.post('/tickets', requireUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { subject, description, priority, category, order_id } = req.body;
    const ticketNumber = `TK${Date.now()}`;
    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber, userId: user.user_id.toString(), userEmail: user.email, userName: user.display_name || user.email,
        subject, description, priority: priority || 'normal', category: category || 'other',
        orderId: order_id || null,
      },
    });
    res.status(201).json(ticket);
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.get('/tickets/my', requireUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: user.user_id.toString() },
      orderBy: { createdAt: 'desc' },
      include: { messages: { where: { isInternal: false }, orderBy: { createdAt: 'asc' } } },
    });
    res.json(tickets);
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});
// ════════════════════════════════════════════════════
// BLOG CATEGORIES
// ════════════════════════════════════════════════════


router.get(['/blog/categories', '/blog/admin/categories'], async (_req: Request, res: Response) => {
  const cats = await prisma.blogCategory.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] });
  res.json(cats);
});

router.post('/blog/admin/categories', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const { name, description, sort_order } = req.body;
    const slug = req.body.slug || slugify(name, { lower: true, strict: true });
    const cat = await prisma.blogCategory.create({ data: { name, slug, description: description || null, sortOrder: sort_order || 0 } });
    res.status(201).json(cat);
  } catch (e: any) { res.status(500).json({ detail: e.message }); }
});

router.put('/blog/admin/categories/:id', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const { name, description, sort_order, is_active } = req.body;
    const cat = await prisma.blogCategory.update({
      where: { id: parseInt(req.params.id) },
      data: { ...(name && { name }), ...(description !== undefined && { description }), ...(sort_order !== undefined && { sortOrder: sort_order }), ...(is_active !== undefined && { isActive: is_active }) },
    });
    res.json(cat);
  } catch (e: any) { res.status(500).json({ detail: e.message }); }
});

router.delete('/blog/admin/categories/:id', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try { await prisma.blogCategory.delete({ where: { id: parseInt(req.params.id) } }); res.json({ ok: true }); }
  catch (e: any) { res.status(500).json({ detail: e.message }); }
});

router.post('/blog/admin/categories/bulk-delete', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const ids = (req.body.ids || []).map((i: any) => parseInt(i));
    await prisma.blogCategory.deleteMany({ where: { id: { in: ids } } });
    res.json({ deleted: ids.length });
  } catch (e: any) { res.status(500).json({ detail: e.message }); }
});

router.post('/blog/admin/posts/bulk-delete', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const ids = (req.body.ids || []).map((i: any) => parseInt(i));
    await prisma.blogPost.deleteMany({ where: { id: { in: ids } } });
    res.json({ deleted: ids.length });
  } catch (e: any) { res.status(500).json({ detail: e.message }); }
});

// ════════════════════════════════════════════════════
// SUPPORT PAGES
// ════════════════════════════════════════════════════
router.get('/support/pages', async (_req: Request, res: Response) => {
  const pages = await prisma.supportPage.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] });
  res.json(pages);
});

router.post('/support/pages', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const { title, content, page_type, sort_order } = req.body;
    const slug = req.body.slug || slugify(title, { lower: true, strict: true });
    const page = await prisma.supportPage.create({ data: { title, slug, content: content || '', pageType: page_type || null, sortOrder: sort_order || 0 } });
    res.status(201).json(page);
  } catch (e: any) { res.status(500).json({ detail: e.message }); }
});

router.put('/support/pages/:id', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const { title, content, page_type, sort_order, is_published } = req.body;
    const page = await prisma.supportPage.update({
      where: { id: parseInt(req.params.id) },
      data: { ...(title && { title }), ...(content !== undefined && { content }), ...(page_type !== undefined && { pageType: page_type }), ...(sort_order !== undefined && { sortOrder: sort_order }), ...(is_published !== undefined && { isPublished: is_published }) },
    });
    res.json(page);
  } catch (e: any) { res.status(500).json({ detail: e.message }); }
});

router.delete('/support/pages/:id', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try { await prisma.supportPage.delete({ where: { id: parseInt(req.params.id) } }); res.json({ ok: true }); }
  catch (e: any) { res.status(500).json({ detail: e.message }); }
});

// ════════════════════════════════════════════════════
// SUPPORT TICKETS
// ════════════════════════════════════════════════════
router.get('/support/tickets', requireUser, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const tickets = await prisma.supportTicket.findMany({ where: { userId: String(user.user_id) }, orderBy: { id: 'desc' } });
  res.json(tickets);
});

router.post('/support/tickets', requireUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { subject, description, priority, category, order_id } = req.body;
    const ticketNumber = 'TK' + Date.now().toString(36).toUpperCase();
    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber,
        userId: String(user.user_id),
        userEmail: user.email,
        userName: user.display_name || user.email,
        subject, description,
        priority: priority || 'normal',
        category: category || null,
        orderId: order_id ? parseInt(order_id) : null,
      },
    });
    res.status(201).json(ticket);
  } catch (e: any) { res.status(500).json({ detail: e.message }); }
});

router.get('/support/tickets/:id', requireUser, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const ticket = await prisma.supportTicket.findFirst({
    where: { id: parseInt(req.params.id), userId: String(user.user_id) },
    include: { messages: { orderBy: { id: 'asc' } } },
  });
  if (!ticket) { res.status(404).json({ detail: 'Không tìm thấy ticket' }); return; }
  res.json(ticket);
});

router.post('/support/tickets/:id/messages', requireUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const ticket = await prisma.supportTicket.findFirst({ where: { id: parseInt(req.params.id), userId: String(user.user_id) } });
    if (!ticket) { res.status(404).json({ detail: 'Không tìm thấy ticket' }); return; }
    const msg = await prisma.ticketMessage.create({
      data: { ticketId: ticket.id, senderId: String(user.user_id), senderName: user.display_name || user.email, senderType: 'user', message: req.body.message },
    });
    res.status(201).json(msg);
  } catch (e: any) { res.status(500).json({ detail: e.message }); }
});

// Chi tiết 1 trang theo slug (public) — đặt SAU /support/pages để không nuốt route
router.get('/support/:slug', async (req: Request, res: Response) => {
  const page = await prisma.supportPage.findUnique({ where: { slug: req.params.slug } });
  if (!page || !page.isPublished) { res.status(404).json({ detail: 'Không tìm thấy trang' }); return; }
  res.json(page);
});

export default router;
