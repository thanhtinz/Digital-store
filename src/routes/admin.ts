import { Router, Request, Response } from 'express';
import slugify from 'slugify';
import prisma from '../db';
import { requireAdmin, requireStaffOrAdmin } from '../middleware/auth';
import { money } from '../services/orders';
import { getFeatures } from '../services/features';

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
        parentId: parent_id || null,
        productType: product_type || 'premium',
        sortOrder: sort_order || 0,
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
        ...(parent_id !== undefined && { parentId: parent_id }),
        ...(product_type && { productType: product_type }),
        ...(sort_order !== undefined && { sortOrder: sort_order }),
        ...(is_active !== undefined && { isActive: is_active }),
      },
    });
    res.json(cat);
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.delete('/categories/:id', requireAdmin, async (req: Request, res: Response) => {
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

router.delete(['/banners/:id', '/banners/admin/:id'], requireAdmin, async (req: Request, res: Response) => {
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
    const publicKeys = ['site_name', 'site_logo', 'site_description', 'currency', 'tax_rate', 'home_categories'];
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

    res.json({ total, page, items: users.map((u: any) => ({ ...u, balance: money(u.balance) })) });
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

// ════════════════════════════════════════════════════
// ANNOUNCEMENTS
// ════════════════════════════════════════════════════

router.get(['/announcements', '/announcements/admin/all'], async (_req: Request, res: Response) => {
  const items = await prisma.announcement.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
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

router.delete(['/admin/announcements/:id', '/announcements/admin/:id'], requireAdmin, async (req: Request, res: Response) => {
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

router.post(['/admin/gift-codes', '/gift-codes/admin'], requireAdmin, async (req: Request, res: Response) => {
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

router.delete(['/admin/gift-codes/:id', '/gift-codes/admin/:id'], requireAdmin, async (req: Request, res: Response) => {
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

router.post(['/admin/flash-sales', '/flash-sales/admin'], requireAdmin, async (req: Request, res: Response) => {
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

router.delete(['/admin/flash-sales/:id', '/flash-sales/admin/:id'], requireAdmin, async (req: Request, res: Response) => {
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

// ── Settings: public / unified / database ──────────────
router.get('/admin/settings/public', async (_req: Request, res: Response) => {
  const publicKeys = ['site_name', 'site_logo', 'site_description', 'site_banner', 'currency', 'tax_rate', 'home_categories'];
  const configs = await prisma.siteConfig.findMany({ where: { key: { in: publicKeys } } });
  const map = Object.fromEntries(configs.map((c: { key: string; value: string | null }) => [c.key, c.value]));
  res.json(await withPublicFlags(map));
});

// Các nhóm cài đặt được lưu dưới dạng 1 row JSON mỗi nhóm (key = tên nhóm)
const SETTINGS_GROUPS = [
  'settings_general', 'settings_appearance', 'settings_scripts', 'settings_images',
  'settings_security', 'settings_captcha', 'settings_features', 'settings_loyalty',
];

// Mirror sang key phẳng để phần còn lại của app (SEO, tiền tệ, thuế, ảnh, loyalty) đọc được
function flatMirror(payload: Record<string, any>): Record<string, string> {
  const g = payload.settings_general || {};
  const im = payload.settings_images || {};
  const lo = payload.settings_loyalty || {};
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
router.post('/categories/bulk-delete', requireAdmin, async (req: Request, res: Response) => {
  try {
    const ids = (req.body.ids || []).map((i: any) => parseInt(i));
    await prisma.category.deleteMany({ where: { id: { in: ids } } });
    res.json({ deleted: ids.length });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Banner images library ──────────────────────────────
router.get('/banners/admin/images', requireAdmin, async (_req: Request, res: Response) => {
  const imgs = await prisma.uploadedImage.findMany({ orderBy: { id: 'desc' }, take: 100, select: { id: true, filename: true, createdAt: true } });
  res.json(imgs.map((i: any) => ({ id: i.id, filename: i.filename, url: `/api/images/${i.id}`, created_at: i.createdAt?.toISOString() })));
});

router.delete('/banners/admin/images/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.uploadedImage.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Gift codes: public + quote ─────────────────────────
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
    package_name: s.package?.name,
    sale_price: money(s.salePrice),
    original_price: s.package ? money(s.package.price) : 0,
    quantity_limit: s.quantityLimit,
    quantity_sold: s.quantitySold,
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
