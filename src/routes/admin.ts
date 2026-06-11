import { Router, Request, Response } from 'express';
import slugify from 'slugify';
import multer from 'multer';
import sharp from 'sharp';
import bcrypt from 'bcryptjs';
import prisma from '../db';
import { requireAdmin, requireStaffOrAdmin } from '../middleware/auth';
import { money } from '../services/orders';
import { getFeatures } from '../services/features';
import { sendMail } from '../services/mail';

const uploadImage = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

const router = Router();

/** Gắn thêm `features` (boolean) + `maintenance` ({on,message}) vào payload public. */
async function withPublicFlags(map: Record<string, any>): Promise<Record<string, any>> {
  const f = await getFeatures();
  const { maintenance, maintenance_message, ...features } = f;
  return {
    ...map,
    features,
    maintenance: {
      on: maintenance === true || maintenance === '1' || maintenance === 'true',
      message: String(maintenance_message || '').slice(0, 500),
    },
  };
}

// ════════════════════════════════════════════════════
// CATEGORIES
// ════════════════════════════════════════════════════

router.get(['/categories', '/categories/all'], async (_req: Request, res: Response) => {
  try {
    const cats = await prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { children: true },
    });
    // Tự backfill slug bị null/rỗng (dữ liệu cũ) để điều hướng & khớp tab hoạt động đúng.
    const missing = cats.filter((c) => !c.slug || !c.slug.trim());
    if (missing.length) {
      const used = new Set(cats.map((c) => c.slug).filter(Boolean));
      for (const c of missing) {
        const base = slugify(c.name || `cat-${c.id}`, { lower: true, strict: true }) || `cat-${c.id}`;
        let slug = base;
        if (used.has(slug)) slug = `${base}-${c.id}`;
        while (used.has(slug)) slug = `${base}-${c.id}-${Math.random().toString(36).slice(2, 6)}`;
        used.add(slug);
        c.slug = slug;
        await prisma.category.update({ where: { id: c.id }, data: { slug } });
      }
    }
    res.json(cats);
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.post('/categories', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const { name, icon_url, image_url, parent_id, product_type, sort_order, is_active } = req.body;
    const slug = slugify(name, { lower: true, strict: true });
    const cat = await prisma.category.create({
      data: {
        name, slug,
        iconUrl: icon_url || null,
        imageUrl: image_url || null,
        parentId: parent_id ? Number(parent_id) : null,
        productType: product_type || 'premium',
        sortOrder: Number(sort_order) || 0,
        isActive: is_active !== false,
      },
    });
    res.status(201).json(cat);
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.patch('/categories/:id', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name, icon_url, image_url, parent_id, product_type, sort_order, is_active } = req.body;
    const cat = await prisma.category.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(icon_url !== undefined && { iconUrl: icon_url }),
        ...(image_url !== undefined && { imageUrl: image_url }),
        ...(parent_id !== undefined && { parentId: parent_id ? Number(parent_id) : null }),
        ...(product_type && { productType: product_type }),
        ...(sort_order !== undefined && { sortOrder: Number(sort_order) || 0 }),
        ...(is_active !== undefined && { isActive: !!is_active }),
      },
    });
    res.json(cat);
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.delete('/categories/:id', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.category.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Đã xóa danh mục' });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ════════════════════════════════════════════════════
// BANNERS
// ════════════════════════════════════════════════════

router.get('/banners', async (_req: Request, res: Response) => {
  const banners = await prisma.banner.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  res.json(banners);
});

router.get(['/banners/all', '/banners/admin/list'], requireStaffOrAdmin, async (_req: Request, res: Response) => {
  const banners = await prisma.banner.findMany({ orderBy: { sortOrder: 'asc' } });
  res.json(banners);
});

router.post(['/banners', '/banners/admin'], requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const { title, image_url, link, banner_type, sort_order, is_active } = req.body;
    const banner = await prisma.banner.create({
      data: { title, imageUrl: image_url, link: link || null, bannerType: banner_type || 'hero', sortOrder: sort_order || 0, isActive: is_active !== false },
    });
    res.status(201).json(banner);
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.patch(['/banners/:id', '/banners/admin/:id'], requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { title, image_url, link, banner_type, sort_order, is_active } = req.body;
    const banner = await prisma.banner.update({
      where: { id },
      data: { title, imageUrl: image_url, link, bannerType: banner_type, sortOrder: sort_order, isActive: is_active },
    });
    res.json(banner);
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.delete(['/banners/:id', '/banners/admin/:id'], requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.banner.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Đã xóa banner' });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ════════════════════════════════════════════════════
// SITE CONFIG
// ════════════════════════════════════════════════════

router.get('/settings', async (_req: Request, res: Response) => {
  try {
    const publicKeys = ['site_name', 'site_logo', 'site_description', 'currency', 'tax_rate', 'home_categories', 'contact_email', 'hotline', 'zalo', 'facebook', 'address', 'working_hours', 'copyright_text', 'footer_about', 'youtube', 'tiktok', 'telegram', 'instagram'];
    const configs = await prisma.siteConfig.findMany({ where: { key: { in: publicKeys } } });
    const map = Object.fromEntries(configs.map((c: { key: string; value: string | null }) => [c.key, c.value]));
    res.json(await withPublicFlags(map));
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.get('/admin/settings', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const configs = await prisma.siteConfig.findMany({ orderBy: { key: 'asc' } });
    res.json(Object.fromEntries(configs.map((c: { key: string; value: string | null }) => [c.key, c.value])));
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.patch('/admin/settings', requireAdmin, async (req: Request, res: Response) => {
  try {
    const updates = req.body as Record<string, string>;
    await Promise.all(
      Object.entries(updates).map(([key, value]) =>
        prisma.siteConfig.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        })
      )
    );
    res.json({ message: 'Đã lưu cấu hình' });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ════════════════════════════════════════════════════
// USERS (admin)
// ════════════════════════════════════════════════════

router.get(['/admin/users', '/auth/admin/users'], requireAdmin, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string;

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: { id: true, email: true, displayName: true, avatarUrl: true, balance: true, isActive: true, createdAt: true },
      }),
    ]);

    // Gắn vai trò (từ bảng adminUser)
    const emails = users.map((u: any) => u.email);
    const admins = emails.length ? await prisma.adminUser.findMany({ where: { email: { in: emails } }, select: { email: true, role: true } }) : [];
    const roleMap: Record<string, string> = Object.fromEntries(admins.map((a: any) => [a.email, a.role]));
    res.json({ total, page, items: users.map((u: any) => ({ ...u, balance: money(u.balance), role: roleMap[u.email] || 'user' })) });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.patch(['/admin/users/:id', '/auth/admin/users/:id'], requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { is_active, display_name } = req.body;
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(is_active !== undefined && { isActive: is_active }),
        ...(display_name && { displayName: display_name }),
      },
    });
    res.json({ id: user.id, email: user.email, isActive: user.isActive });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// Đổi vai trò người dùng (user/staff/admin/superadmin) — quản lý bảng adminUser
router.patch(['/admin/users/:id/role'], requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const role = String(req.body.role || 'user');
    const allowed = ['user', 'staff', 'admin', 'superadmin'];
    if (!allowed.includes(role)) { res.status(400).json({ detail: 'Vai trò không hợp lệ' }); return; }
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) { res.status(404).json({ detail: 'Không tìm thấy người dùng' }); return; }
    // Không cho tự hạ quyền chính mình (tránh tự khóa khỏi admin)
    const me = (req as any).admin;
    if (me && String(me.user_id) === String(id) && role !== me.role) {
      res.status(400).json({ detail: 'Không thể tự đổi vai trò của chính mình' }); return;
    }
    if (role === 'user') {
      await prisma.adminUser.deleteMany({ where: { email: user.email } });
    } else {
      await prisma.adminUser.upsert({
        where: { email: user.email },
        update: { role },
        create: { userId: String(user.id), email: user.email, role },
      });
    }
    res.json({ ok: true, role });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

/** Admin: đặt lại mật khẩu người dùng (sinh mật khẩu tạm + gửi email + trả về cho admin). */
router.post(['/admin/users/:id/reset-password'], requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) { res.status(404).json({ detail: 'Không tìm thấy người dùng' }); return; }
    const newPassword = Math.random().toString(36).slice(-4) + Math.random().toString(36).toUpperCase().slice(-4) + '@' + Math.floor(Math.random() * 90 + 10);
    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id }, data: { passwordHash: hash } });
    // Cố gắng gửi email (không chặn nếu mail chưa cấu hình)
    const mail = await sendMail({
      to: user.email,
      subject: '[Admin] Mật khẩu mới của bạn',
      html: `<p>Mật khẩu mới của bạn là: <b>${newPassword}</b></p><p>Vui lòng đăng nhập và đổi lại mật khẩu.</p>`,
    }).catch(() => ({ ok: false }));
    res.json({ ok: true, new_password: newPassword, email_sent: !!mail.ok });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

/** Admin: gửi thông báo hệ thống tới TẤT CẢ người dùng (chuông trong app). */
router.post('/admin/notifications/broadcast', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { title, body, type, link } = req.body;
    if (!title || !String(title).trim()) { res.status(422).json({ detail: 'Thiếu tiêu đề' }); return; }
    const users = await prisma.user.findMany({ where: { isActive: true }, select: { id: true } });
    if (!users.length) { res.json({ ok: true, sent: 0 }); return; }
    await prisma.notification.createMany({
      data: users.map((u: any) => ({
        userId: u.id,
        type: type || 'system',
        title: String(title).slice(0, 255),
        body: body ? String(body) : null,
        link: link || null,
      })),
    });
    res.json({ ok: true, sent: users.length });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ════════════════════════════════════════════════════
// DASHBOARD STATS
// ════════════════════════════════════════════════════

router.get(['/admin/stats', '/admin/dashboard'], requireStaffOrAdmin, async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalOrders, totalUsers, totalProducts,
      paidOrders, monthlyOrders,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.user.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.order.aggregate({ where: { status: 'completed' }, _sum: { totalAmount: true } }),
      prisma.order.aggregate({
        where: { status: 'completed', createdAt: { gte: monthStart } },
        _sum: { totalAmount: true },
      }),
    ]);

    res.json({
      total_orders: totalOrders,
      total_users: totalUsers,
      total_products: totalProducts,
      total_revenue: money(paidOrders._sum.totalAmount),
      monthly_revenue: money(monthlyOrders._sum.totalAmount),
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// Dashboard A-Z — số liệu giàu hơn cho admin mới (doanh thu ngày/tuần/tháng,
// trạng thái đơn, đơn mới nhất, cảnh báo tồn kho, biểu đồ 14 ngày).
router.get('/admin/stats/overview', requireStaffOrAdmin, async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(startOfDay.getTime() - 6 * 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const series14Start = new Date(startOfDay.getTime() - 13 * 86400000);
    const COMPLETED = ['completed'];

    const [
      totalOrders, totalUsers, totalProducts, newUsersMonth,
      revAll, revMonth, revWeek, revToday,
      statusGroups, recentOrders, seriesOrders, autoPkgs,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.user.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.order.aggregate({ where: { status: { in: COMPLETED } }, _sum: { totalAmount: true } }),
      prisma.order.aggregate({ where: { status: { in: COMPLETED }, createdAt: { gte: monthStart } }, _sum: { totalAmount: true } }),
      prisma.order.aggregate({ where: { status: { in: COMPLETED }, createdAt: { gte: weekAgo } }, _sum: { totalAmount: true } }),
      prisma.order.aggregate({ where: { status: { in: COMPLETED }, createdAt: { gte: startOfDay } }, _sum: { totalAmount: true } }),
      prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.order.findMany({
        orderBy: { createdAt: 'desc' }, take: 8,
        include: { package: { include: { product: true } } },
      }),
      prisma.order.findMany({
        where: { status: { in: COMPLETED }, createdAt: { gte: series14Start } },
        select: { createdAt: true, totalAmount: true },
      }),
      prisma.productPackage.findMany({
        where: { deliveryType: 'auto', isActive: true },
        select: { id: true, name: true, product: { select: { name: true } } },
        take: 1000,
      }),
    ]);

    // Trạng thái đơn -> map
    const statusBreakdown: Record<string, number> = {};
    for (const g of statusGroups as any[]) statusBreakdown[g.status] = g._count._all;

    // Chuỗi doanh thu 14 ngày
    const dayKey = (d: Date) => d.toISOString().slice(0, 10);
    const seriesMap: Record<string, number> = {};
    for (let i = 0; i < 14; i++) seriesMap[dayKey(new Date(series14Start.getTime() + i * 86400000))] = 0;
    for (const o of seriesOrders as any[]) {
      const k = dayKey(new Date(o.createdAt));
      if (k in seriesMap) seriesMap[k] += money(o.totalAmount);
    }
    const revenueSeries = Object.entries(seriesMap).map(([date, revenue]) => ({ date, revenue }));

    // Cảnh báo tồn kho thấp (gói auto còn <=5)
    let lowStock: Array<{ product: string; package: string; remaining: number }> = [];
    if (autoPkgs.length) {
      const counts = await prisma.stockItem.groupBy({
        by: ['packageId'],
        where: { isSold: false, packageId: { in: (autoPkgs as any[]).map((p) => p.id) } },
        _count: { _all: true },
      });
      const cmap: Record<number, number> = {};
      for (const c of counts as any[]) cmap[c.packageId] = c._count._all;
      lowStock = (autoPkgs as any[])
        .map((p) => ({ product: p.product?.name || '', package: p.name, remaining: cmap[p.id] || 0 }))
        .filter((x) => x.remaining <= 5)
        .sort((a, b) => a.remaining - b.remaining)
        .slice(0, 12);
    }

    res.json({
      totals: {
        orders: totalOrders,
        users: totalUsers,
        products: totalProducts,
        new_users_month: newUsersMonth,
      },
      revenue: {
        total: money(revAll._sum.totalAmount),
        month: money(revMonth._sum.totalAmount),
        week: money(revWeek._sum.totalAmount),
        today: money(revToday._sum.totalAmount),
      },
      status_breakdown: statusBreakdown,
      pending_orders: (statusBreakdown['pending'] || 0) + (statusBreakdown['pending_payment'] || 0) + (statusBreakdown['paid'] || 0),
      revenue_series: revenueSeries,
      low_stock: lowStock,
      recent_orders: (recentOrders as any[]).map((o) => ({
        order_code: o.orderCode,
        user_email: o.userEmail,
        product_name: o.package?.product?.name || null,
        total: money(o.totalAmount),
        status: o.status,
        created_at: o.createdAt?.toISOString(),
      })),
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ════════════════════════════════════════════════════
// ANNOUNCEMENTS
// ════════════════════════════════════════════════════

router.get('/announcements', async (_req: Request, res: Response) => {
  const items = await prisma.announcement.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  res.json(items);
});

// Admin: xem TẤT CẢ (kể cả đang ẩn) để quản lý.
router.get('/announcements/admin/all', requireStaffOrAdmin, async (_req: Request, res: Response) => {
  const items = await prisma.announcement.findMany({ orderBy: { sortOrder: 'asc' } });
  res.json(items);
});

router.post(['/admin/announcements', '/announcements/admin'], requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const { title, content, type, is_active, sort_order } = req.body;
    const item = await prisma.announcement.create({
      data: { title, content, type: type || 'info', isActive: is_active !== false, sortOrder: sort_order || 0 },
    });
    res.status(201).json(item);
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.patch(['/admin/announcements/:id', '/announcements/admin/:id'], requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const item = await prisma.announcement.update({ where: { id: parseInt(req.params.id) }, data: req.body });
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.delete(['/admin/announcements/:id', '/announcements/admin/:id'], requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.announcement.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Đã xóa' });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ════════════════════════════════════════════════════
// GIFT CODES
// ════════════════════════════════════════════════════

router.get(['/admin/gift-codes', '/gift-codes/admin/list'], requireStaffOrAdmin, async (_req: Request, res: Response) => {
  const codes = await prisma.giftCode.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(codes);
});

router.post(['/admin/gift-codes', '/gift-codes/admin'], requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const { code, discount_type, discount_value, min_order, max_discount, usage_limit, per_user_limit, expires_at, is_active, is_public, description } = req.body;
    const item = await prisma.giftCode.create({
      data: {
        code, discountType: discount_type || 'percent', discountValue: discount_value,
        minOrder: min_order || 0, maxDiscount: max_discount || null,
        usageLimit: usage_limit || 0, perUserLimit: per_user_limit || 1,
        expiresAt: expires_at ? new Date(expires_at) : null,
        isActive: is_active !== false, isPublic: is_public || false, description: description || null,
      },
    });
    res.status(201).json(item);
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.delete(['/admin/gift-codes/:id', '/gift-codes/admin/:id'], requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.giftCode.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Đã xóa mã giảm giá' });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ════════════════════════════════════════════════════
// FLASH SALES
// ════════════════════════════════════════════════════

router.get(['/admin/flash-sales', '/flash-sales/admin/list'], requireStaffOrAdmin, async (_req: Request, res: Response) => {
  const items = await prisma.flashSale.findMany({ include: { package: { include: { product: true } } } });
  res.json(items);
});

router.post(['/admin/flash-sales', '/flash-sales/admin'], requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const { package_id, sale_price, quantity_limit, starts_at, ends_at } = req.body;
    const item = await prisma.flashSale.create({
      data: { packageId: package_id, salePrice: sale_price, quantityLimit: quantity_limit || 0, startsAt: new Date(starts_at), endsAt: new Date(ends_at) },
    });
    res.status(201).json(item);
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.delete(['/admin/flash-sales/:id', '/flash-sales/admin/:id'], requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.flashSale.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Đã xóa flash sale' });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ════════════════════════════════════════════════════
// SUPPORT PAGES
// ════════════════════════════════════════════════════

router.get('/support-pages', async (req: Request, res: Response) => {
  const { slug, type } = req.query;
  const where: any = { isPublished: true };
  if (slug) where.slug = slug;
  if (type) where.pageType = type;
  const pages = await prisma.supportPage.findMany({ where, orderBy: { sortOrder: 'asc' } });
  res.json(pages);
});

router.post('/admin/support-pages', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const { slug, title, content, page_type, meta_description, is_published, sort_order } = req.body;
    const page = await prisma.supportPage.upsert({
      where: { slug },
      update: { title, content, pageType: page_type, metaDescription: meta_description, isPublished: is_published !== false, sortOrder: sort_order || 0 },
      create: { slug, title, content, pageType: page_type, metaDescription: meta_description, isPublished: is_published !== false, sortOrder: sort_order || 0 },
    });
    res.json(page);
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ════════════════════════════════════════════════════
// SUPPORT TICKETS
// ════════════════════════════════════════════════════

router.get('/admin/tickets', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const where: any = {};
    if (status) where.status = status;
    const [total, tickets] = await Promise.all([
      prisma.supportTicket.count({ where }),
      prisma.supportTicket.findMany({
        where, orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit, take: limit,
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      }),
    ]);
    res.json({ total, page, items: tickets });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// Admin trả lời ticket
router.post('/admin/tickets/:id/reply', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const message = String(req.body.message || '').trim();
    if (!message) { res.status(400).json({ detail: 'Nội dung không được trống' }); return; }
    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) { res.status(404).json({ detail: 'Không tìm thấy ticket' }); return; }
    const admin = (req as any).admin || {};
    const msg = await prisma.ticketMessage.create({
      data: { ticketId: id, senderId: String(admin.user_id || 'admin'), senderName: admin.display_name || admin.email || 'Hỗ trợ', senderType: 'admin', message },
    });
    await prisma.supportTicket.update({ where: { id }, data: { status: 'answered', updatedAt: new Date() } });
    res.status(201).json(msg);
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// Admin đổi trạng thái ticket
router.patch('/admin/tickets/:id', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const status = String(req.body.status || '').trim();
    const allowed = ['open', 'answered', 'pending', 'resolved', 'closed'];
    if (!allowed.includes(status)) { res.status(400).json({ detail: 'Trạng thái không hợp lệ' }); return; }
    const data: any = { status, updatedAt: new Date() };
    if (status === 'resolved' || status === 'closed') data.resolvedAt = new Date();
    const t = await prisma.supportTicket.update({ where: { id }, data });
    res.json(t);
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Settings: public / unified / database ──────────────
router.get('/admin/settings/public', async (_req: Request, res: Response) => {
  const publicKeys = ['site_name', 'site_logo', 'site_description', 'site_banner', 'currency', 'tax_rate', 'home_categories', 'contact_email', 'hotline', 'zalo', 'facebook', 'address', 'working_hours', 'copyright_text', 'footer_about', 'youtube', 'tiktok', 'telegram', 'instagram'];
  const configs = await prisma.siteConfig.findMany({ where: { key: { in: publicKeys } } });
  const map = Object.fromEntries(configs.map((c: { key: string; value: string | null }) => [c.key, c.value]));
  res.json(await withPublicFlags(map));
});

// Các nhóm cài đặt được lưu dưới dạng 1 row JSON mỗi nhóm (key = tên nhóm)
const SETTINGS_GROUPS = [
  'settings_general', 'settings_appearance', 'settings_scripts', 'settings_images',
  'settings_security', 'settings_captcha', 'settings_features', 'settings_loyalty', 'settings_checkin',
];

// Mirror sang key phẳng để phần còn lại của app (SEO, tiền tệ, thuế, ảnh, loyalty) đọc được
function flatMirror(payload: Record<string, any>): Record<string, string> {
  const g = payload.settings_general || {};
  const im = payload.settings_images || {};
  const lo = payload.settings_loyalty || {};
  const ck = payload.settings_checkin || {};
  const out: Record<string, string> = {};
  const set = (k: string, v: any) => { if (v !== undefined && v !== null && v !== '') out[k] = String(v); };
  // General -> SEO/tiền/thuế
  set('site_name', g.title);
  set('site_description', g.site_description ?? g.description);
  set('copyright_text', g.copyright_text);
  set('seo_title', g.seo_title);
  set('seo_description', g.seo_description);
  set('seo_keywords', g.seo_keywords);
  set('seo_author', g.seo_author);
  set('twitter_card', g.twitter_card);
  set('currency_name', g.currency_name);
  set('currency_icon', g.currency_icon);
  if (g.tax_rate !== undefined && g.tax_rate !== '') set('tax_rate', g.tax_rate);
  // Images
  set('site_logo', im.logo_url);
  set('favicon_url', im.favicon_url);
  set('default_image_url', im.default_image_url);
  set('seo_image_url', im.seo_image_url);
  set('default_avatar_url', im.default_avatar_url);
  // Loyalty -> key loyalty_* (service đọc)
  if (lo.enabled !== undefined) out['loyalty_enabled'] = lo.enabled ? '1' : '0';
  set('loyalty_earn_per', lo.earn_per);
  set('loyalty_redeem_value', lo.redeem_value);
  set('loyalty_min_redeem', lo.min_redeem);
  set('loyalty_max_percent', lo.max_percent);
  // Điểm danh -> checkin_*
  if (ck.enabled !== undefined) out['checkin_enabled'] = ck.enabled ? '1' : '0';
  if (ck.rewards !== undefined) out['checkin_rewards'] = typeof ck.rewards === 'string' ? ck.rewards : JSON.stringify(ck.rewards);
  return out;
}

router.get('/admin/settings/unified', requireAdmin, async (_req: Request, res: Response) => {
  const configs = await prisma.siteConfig.findMany();
  const map: Record<string, string | null> = Object.fromEntries(configs.map((c: any) => [c.key, c.value]));
  const out: Record<string, any> = { ...map };
  // Giải JSON các nhóm để frontend đọc nested (settings_general...)
  for (const grp of SETTINGS_GROUPS) {
    if (map[grp]) { try { out[grp] = JSON.parse(map[grp] as string); } catch { out[grp] = {}; } }
    else if (!out[grp]) out[grp] = {};
  }
  res.json(out);
});

router.put('/admin/settings/unified', requireAdmin, async (req: Request, res: Response) => {
  try {
    const payload = (req.body || {}) as Record<string, any>;
    const upserts: Array<{ key: string; value: string }> = [];
    // 1) Lưu mỗi nhóm dưới dạng JSON (round-trip cho form admin)
    for (const grp of SETTINGS_GROUPS) {
      if (payload[grp] && typeof payload[grp] === 'object') {
        upserts.push({ key: grp, value: JSON.stringify(payload[grp]) });
      }
    }
    // 2) Mirror sang key phẳng cho phần còn lại của app
    for (const [k, v] of Object.entries(flatMirror(payload))) upserts.push({ key: k, value: v });

    await Promise.all(upserts.map((u) =>
      prisma.siteConfig.upsert({ where: { key: u.key }, update: { value: u.value }, create: { key: u.key, value: u.value } })
    ));
    res.json({ message: 'Đã lưu cài đặt' });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.put('/admin/settings/database', requireAdmin, async (req: Request, res: Response) => {
  try {
    // Lưu cấu hình provider DB (dùng cho script db-switch). Không đổi kết nối đang chạy.
    const providers = req.body?.providers ?? req.body ?? {};
    await prisma.siteConfig.upsert({
      where: { key: 'db_providers' },
      update: { value: JSON.stringify(providers) },
      create: { key: 'db_providers', value: JSON.stringify(providers) },
    });
    res.json({ ok: true, message: 'Đã lưu cấu hình database' });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.get('/admin/settings/database', requireAdmin, async (_req: Request, res: Response) => {
  // Trả về trạng thái kết nối DB (không lộ connection string)
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ connected: true, provider: 'postgresql' });
  } catch (e: any) {
    res.json({ connected: false, error: e.message });
  }
});

router.post('/admin/settings/database/test-connection', requireAdmin, async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, message: 'Kết nối database thành công' });
  } catch (e: any) {
    res.status(400).json({ ok: false, detail: e.message });
  }
});

// ── Bulk delete ────────────────────────────────────────
router.post('/categories/bulk-delete', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const ids = (req.body.ids || []).map((i: any) => parseInt(i));
    await prisma.category.deleteMany({ where: { id: { in: ids } } });
    res.json({ deleted: ids.length });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Banner images library ──────────────────────────────
router.get('/banners/admin/images', requireStaffOrAdmin, async (_req: Request, res: Response) => {
  const imgs = await prisma.uploadedImage.findMany({ orderBy: { id: 'desc' }, take: 100, select: { id: true, filename: true, createdAt: true } });
  res.json(imgs.map((i: any) => ({ id: i.id, filename: i.filename, url: `/api/images/${i.id}`, created_at: i.createdAt?.toISOString() })));
});

// Upload ảnh -> lưu DB, nén/chuẩn hóa qua sharp (an toàn: lỗi thì giữ gốc).
// Trả về { id, url } để dán vào product/banner...
router.post('/banners/admin/upload-image', requireStaffOrAdmin, uploadImage.single('file'), async (req: Request, res: Response) => {
  try {
    const f = (req as any).file;
    if (!f || !f.buffer) { res.status(400).json({ detail: 'Thiếu file ảnh' }); return; }
    let data: Buffer = f.buffer;
    let mime = f.mimetype || 'image/jpeg';
    const isGif = (f.mimetype || '').includes('gif');
    try {
      if (isGif) {
        // GIF: đọc animated (mọi frame) -> webp động để GIỮ chuyển động (không bị tĩnh).
        data = await sharp(f.buffer, { animated: true }).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
      } else {
        data = await sharp(f.buffer).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
      }
      mime = 'image/webp';
    } catch {
      // Không xử lý được -> giữ buffer + mime GỐC (GIF gốc vẫn còn animation).
      data = f.buffer;
      mime = f.mimetype || 'image/jpeg';
    }
    const img = await prisma.uploadedImage.create({ data: { filename: f.originalname || null, data, mimeType: mime } });
    res.status(201).json({ id: img.id, url: `/api/images/${img.id}`, filename: img.filename });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.delete('/banners/admin/images/:id', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.uploadedImage.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Gift codes: public + check + quote ─────────────────
// Kiểm tra 1 mã (không cần subtotal) — cho UI nhập mã xem trước.
router.get('/gift-codes/check/:code', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const gc = await prisma.giftCode.findUnique({ where: { code: req.params.code.toUpperCase().trim() } });
    if (!gc || !gc.isActive) { res.status(404).json({ detail: 'Mã không hợp lệ' }); return; }
    if (gc.startsAt && gc.startsAt > now) { res.status(400).json({ detail: 'Mã chưa có hiệu lực' }); return; }
    if (gc.expiresAt && gc.expiresAt < now) { res.status(400).json({ detail: 'Mã đã hết hạn' }); return; }
    if (gc.usageLimit > 0 && gc.usageCount >= gc.usageLimit) {
      res.status(400).json({ detail: 'Mã đã hết lượt sử dụng' });
      return;
    }
    res.json({
      code: gc.code,
      discount_type: gc.discountType,
      discount_value: money(gc.discountValue),
      min_order: money(gc.minOrder),
      max_discount: gc.maxDiscount ? money(gc.maxDiscount) : null,
      description: gc.description,
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.get('/gift-codes/public', async (_req: Request, res: Response) => {
  const now = new Date();
  const codes = await prisma.giftCode.findMany({
    where: {
      isActive: true, isPublic: true,
      OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
    },
    orderBy: { id: 'desc' },
    select: { code: true, discountType: true, discountValue: true, minOrder: true, maxDiscount: true, description: true, expiresAt: true },
  });
  res.json(codes.map((c: any) => ({
    code: c.code,
    discount_type: c.discountType,
    discount_value: money(c.discountValue),
    min_order: money(c.minOrder),
    max_discount: c.maxDiscount ? money(c.maxDiscount) : null,
    description: c.description,
    expires_at: c.expiresAt?.toISOString(),
  })));
});

router.post('/gift-codes/quote', async (req: Request, res: Response) => {
  try {
    const { code, subtotal } = req.body;
    const now = new Date();
    const coupon = await prisma.giftCode.findUnique({ where: { code } });
    if (!coupon || !coupon.isActive) { res.status(400).json({ detail: 'Mã không hợp lệ' }); return; }
    if (coupon.expiresAt && coupon.expiresAt < now) { res.status(400).json({ detail: 'Mã đã hết hạn' }); return; }
    if (money(coupon.minOrder) > (subtotal || 0)) { res.status(400).json({ detail: `Đơn tối thiểu ${money(coupon.minOrder).toLocaleString()}đ` }); return; }
    let discount = coupon.discountType === 'percent'
      ? (subtotal * money(coupon.discountValue)) / 100
      : money(coupon.discountValue);
    if (coupon.maxDiscount) discount = Math.min(discount, money(coupon.maxDiscount));
    res.json({ valid: true, discount: Math.min(discount, subtotal || 0), discount_type: coupon.discountType });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Flash sales: active (public) ───────────────────────
router.get('/flash-sales/active', async (_req: Request, res: Response) => {
  const now = new Date();
  const sales = await prisma.flashSale.findMany({
    where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
    include: { package: { include: { product: true } } },
  });
  res.json(sales.map((s: any) => ({
    id: s.id,
    package_id: s.packageId,
    product_name: s.package?.product?.name,
    product_slug: s.package?.product?.slug,
    product_image: s.package?.product?.imageUrl,
    package_name: s.package?.name,
    sale_price: money(s.salePrice),
    original_price: s.package ? money(s.package.price) : 0,
    quantity_limit: s.quantityLimit,
    quantity_sold: s.quantitySold,
    ends_at: s.endsAt?.toISOString(),
  })));
});

// ── Flash sales: upcoming (public) ─────────────────────
router.get('/flash-sales/upcoming', async (_req: Request, res: Response) => {
  const now = new Date();
  const sales = await prisma.flashSale.findMany({
    where: { isActive: true, startsAt: { gt: now } },
    include: { package: { include: { product: true } } },
    orderBy: { startsAt: 'asc' },
    take: 10,
  });
  res.json(sales.map((s: any) => ({
    id: s.id,
    package_id: s.packageId,
    product_name: s.package?.product?.name,
    product_slug: s.package?.product?.slug,
    product_image: s.package?.product?.imageUrl,
    package_name: s.package?.name,
    sale_price: money(s.salePrice),
    original_price: s.package ? money(s.package.price) : 0,
    quantity_limit: s.quantityLimit,
    quantity_sold: s.quantitySold,
    starts_at: s.startsAt?.toISOString(),
    ends_at: s.endsAt?.toISOString(),
  })));
});

// ── Payment config + history (đọc, cho trang admin payment) ──
router.get('/admin/payment/config', requireAdmin, async (_req: Request, res: Response) => {
  const keys = ['sepay_api_key', 'sepay_account_number', 'sepay_bank_code', 'sepay_webhook_secret', 'app_base_url'];
  const configs = await prisma.siteConfig.findMany({ where: { key: { in: keys } } });
  const map: Record<string, string> = Object.fromEntries(configs.map((c: any) => [c.key, c.value || '']));
  res.json({
    sepay_api_key: map['sepay_api_key'] ? '••••••••' : '',
    sepay_account_number: map['sepay_account_number'] || '',
    sepay_bank_code: map['sepay_bank_code'] || '',
    sepay_webhook_secret: map['sepay_webhook_secret'] ? '••••••••' : '',
    app_base_url: map['app_base_url'] || process.env.APP_BASE_URL || '',
    has_env_override: !!process.env.SEPAY_API_KEY,
  });
});

router.get('/admin/payment/history', requireAdmin, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const status = req.query.status as string;
    const where: any = { paymentMethod: 'sepay' };
    if (status) where.status = status;
    const [items, paid, pending, completed, revenue] = await Promise.all([
      prisma.order.findMany({ where, orderBy: { id: 'desc' }, take: limit, select: { orderCode: true, userEmail: true, totalAmount: true, status: true, paymentMethod: true, createdAt: true } }),
      prisma.order.count({ where: { ...where, status: 'paid' } }),
      prisma.order.count({ where: { ...where, status: 'pending' } }),
      prisma.order.count({ where: { ...where, status: 'completed' } }),
      prisma.order.aggregate({ where: { ...where, status: { in: ['paid', 'completed'] } }, _sum: { totalAmount: true } }),
    ]);
    res.json({
      items: items.map((o: any) => ({ order_code: o.orderCode, user_email: o.userEmail, amount: money(o.totalAmount), status: o.status, created_at: o.createdAt?.toISOString() })),
      stats: { total_revenue: money(revenue._sum.totalAmount), paid, pending, completed },
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

export default router;
