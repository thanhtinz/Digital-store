import { Router, Request, Response } from 'express';
import slugify from 'slugify';
import prisma from '../db';
import { requireAdmin, requireStaffOrAdmin, optionalUser, requireUser } from '../middleware/auth';
import { money } from '../services/orders';
import { getTopupProvider, getPremiumProvider } from '../services/providers';

// Adapter có khả năng browse sản phẩm để import (topup_game | account_premium).
function getCatalogAdapter(provider: any) {
  if (provider.providerType === 'account_premium') {
    return getPremiumProvider({ baseUrl: provider.baseUrl, apiKey: provider.apiKey, apiSecret: provider.apiSecret });
  }
  return getTopupProvider({ baseUrl: provider.baseUrl, apiKey: provider.apiKey });
}

const router = Router();

// ── Đăng ký "báo có hàng lại" cho 1 gói đang hết hàng ──
router.post('/stock-alert', requireUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const packageId = parseInt(req.body.package_id);
    if (!packageId) { res.status(422).json({ detail: 'Thiếu package_id' }); return; }
    const pkg = await prisma.productPackage.findUnique({ where: { id: packageId } });
    if (!pkg) { res.status(404).json({ detail: 'Không tìm thấy gói' }); return; }
    await prisma.stockAlert.upsert({
      where: { userId_packageId: { userId: user.user_id.toString(), packageId } },
      create: { userId: user.user_id.toString(), userEmail: user.email, packageId, notified: false },
      update: { notified: false },
    });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Public: danh sách sản phẩm ────────────────────────
router.get('/', optionalUser, async (req: Request, res: Response) => {
  try {
    const { category, featured, active = 'true', page = '1', limit = '20', search, sort, type } = req.query;
    const where: any = {};
    if (active !== 'all') where.isActive = active !== 'false';
    if (category) where.category = { slug: category };
    // Lọc theo loại danh mục (premium | game | giftcard) cho sidebar storefront.
    if (type) where.category = { ...(where.category || {}), productType: type as string };
    if (featured === 'true') where.isFeatured = true;
    if (search) where.name = { contains: search as string, mode: 'insensitive' };

    // Sắp xếp (lọc nâng cao): newest | oldest | name | popular | mặc định
    const sortMap: Record<string, any> = {
      newest: [{ createdAt: 'desc' }],
      oldest: [{ createdAt: 'asc' }],
      name: [{ name: 'asc' }],
      popular: [{ isFeatured: 'desc' }, { reviews: { _count: 'desc' } }, { createdAt: 'desc' }],
    };
    const orderBy = sortMap[sort as string] || [{ sortOrder: 'asc' }, { createdAt: 'desc' }];

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy,
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
        include: {
          category: true,
          reviews: { where: { isVisible: true }, select: { rating: true } },
          packages: {
            where: { isActive: true },
            orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
            include: {
              flashSales: {
                where: { isActive: true, startsAt: { lte: new Date() }, endsAt: { gte: new Date() } },
              },
            },
          },
        },
      }),
    ]);

    await attachSoldCount(products);
    res.json({ total, page: parseInt(page as string), items: products.map((p) => serializeProduct(p)) });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// Tính "đã bán" cho danh sách sản phẩm: gộp đơn 1 gói (Order.packageId) + đơn nhiều gói (OrderItem).
async function attachSoldCount(products: any[]): Promise<void> {
  const pkgIds = products.flatMap((p: any) => (p.packages || []).map((pk: any) => pk.id));
  if (!pkgIds.length) return;
  const SOLD = ['completed', 'paid'];
  const soldMap: Record<number, number> = {};
  try {
    const [items, orders] = await Promise.all([
      prisma.orderItem.groupBy({ by: ['packageId'], where: { packageId: { in: pkgIds }, status: { in: SOLD } }, _sum: { quantity: true } }),
      prisma.order.groupBy({ by: ['packageId'], where: { packageId: { in: pkgIds }, status: { in: SOLD } }, _sum: { quantity: true } }),
    ]);
    for (const r of items as any[]) if (r.packageId != null) soldMap[r.packageId] = (soldMap[r.packageId] || 0) + (r._sum.quantity || 0);
    for (const r of orders as any[]) if (r.packageId != null) soldMap[r.packageId] = (soldMap[r.packageId] || 0) + (r._sum.quantity || 0);
  } catch {
    /* không chặn list nếu thống kê lỗi */
  }
  products.forEach((p: any) => {
    p._soldCount = (p.packages || []).reduce((s: number, pk: any) => s + (soldMap[pk.id] || 0), 0);
  });
}

// Include dùng chung cho thẻ sản phẩm (gợi ý)
const CARD_INCLUDE = {
  category: true,
  packages: {
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' as const }, { price: 'asc' as const }],
    include: {
      flashSales: {
        where: { isActive: true, startsAt: { lte: new Date() }, endsAt: { gte: new Date() } },
      },
    },
  },
};

// ── Public: sản phẩm nổi bật / bán chạy (gợi ý) ────────
// "Trending" = ưu tiên sản phẩm nổi bật, rồi nhiều đánh giá, rồi mới nhất.
router.get('/trending', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 8, 24);
    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: [{ isFeatured: 'desc' }, { reviews: { _count: 'desc' } }, { createdAt: 'desc' }],
      take: limit,
      include: CARD_INCLUDE,
    });
    res.json({ items: products.map((p) => serializeProduct(p)) });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Public: tìm kiếm nhanh sản phẩm (cho ô search) ─────
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = ((req.query.query as string) || (req.query.q as string) || (req.query.name as string) || '').trim();
    if (!query) { res.json({ results: [] }); return; }
    const products = await prisma.product.findMany({
      where: { isActive: true, name: { contains: query, mode: 'insensitive' } },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      take: 10,
      include: CARD_INCLUDE,
    });
    res.json({ results: products.map((p) => serializeProduct(p)) });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Public: sản phẩm liên quan (cùng danh mục) ─────────
router.get('/:slug/related', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 8, 24);
    const base = await prisma.product.findFirst({ where: { slug: req.params.slug }, select: { id: true, categoryId: true } });
    if (!base) { res.json({ items: [] }); return; }
    const where: any = { isActive: true, id: { not: base.id } };
    if (base.categoryId) where.categoryId = base.categoryId;
    let products = await prisma.product.findMany({
      where, orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }], take: limit, include: CARD_INCLUDE,
    });
    // Nếu cùng danh mục không đủ, bù thêm sản phẩm khác
    if (products.length < limit) {
      const extra = await prisma.product.findMany({
        where: { isActive: true, id: { notIn: [base.id, ...products.map((p) => p.id)] } },
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }], take: limit - products.length, include: CARD_INCLUDE,
      });
      products = [...products, ...extra];
    }
    res.json({ items: products.map((p) => serializeProduct(p)) });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Public: chi tiết sản phẩm ─────────────────────────
router.get('/:slug', optionalUser, async (req: Request, res: Response) => {
  try {
    const product = await prisma.product.findFirst({
      where: { slug: req.params.slug, isActive: true },
      include: {
        category: true,
        packages: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
          include: {
            fields: { orderBy: { sortOrder: 'asc' } },
            flashSales: {
              where: { isActive: true, startsAt: { lte: new Date() }, endsAt: { gte: new Date() } },
            },
          },
        },
        reviews: {
          where: { isVisible: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!product) { res.status(404).json({ detail: 'Không tìm thấy sản phẩm' }); return; }

    // Đính kèm sản phẩm liên quan (cùng danh mục) để frontend hiển thị mục "Sản phẩm liên quan"
    const related = await prisma.product.findMany({
      where: { isActive: true, id: { not: product.id }, ...(product.categoryId ? { categoryId: product.categoryId } : {}) },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      take: 8,
      include: CARD_INCLUDE,
    });
    const dict = serializeProduct(product, true);
    dict.related = related.map((r) => serializeProduct(r));
    res.json(dict);
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Admin: tạo sản phẩm ───────────────────────────────
router.post(['/admin', '/'], requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const { name, category_id, description, notes, image_url, images, is_featured, is_active, sort_order,
      topup_type, server_region } = req.body;
    if (!name) { res.status(422).json({ detail: 'Tên sản phẩm không được để trống' }); return; }
    const slug = slugify(name, { lower: true, strict: true });
    const product = await prisma.product.create({
      data: {
        name, slug, categoryId: category_id ? Number(category_id) : null,
        description: description || null,
        notes: notes || null,
        imageUrl: image_url || null,
        images: Array.isArray(images) ? images : undefined,
        isFeatured: is_featured || false,
        isActive: is_active !== false,
        sortOrder: sort_order || 0,
        topupType: topup_type || null,
        serverRegion: server_region || null,
      },
      include: { category: true },
    });
    res.status(201).json(serializeProduct(product));
  } catch (e: any) {
    if (e.code === 'P2002') {
      res.status(400).json({ detail: 'Slug đã tồn tại' });
    } else {
      res.status(500).json({ detail: e.message });
    }
  }
});

// ── Admin: cập nhật sản phẩm ──────────────────────────
router.patch(['/admin/:id', '/:id'], requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const data: any = {};
    const fields = ['name', 'description', 'notes', 'image_url', 'is_featured', 'is_active', 'sort_order', 'category_id', 'topup_type', 'server_region'];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        const key = f.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
        let val: any = req.body[f];
        // Ép kiểu cho khớp Prisma (form gửi chuỗi).
        if (f === 'category_id') val = val ? Number(val) : null;
        else if (f === 'sort_order') val = Number(val) || 0;
        else if (f === 'is_featured' || f === 'is_active') val = !!val;
        else if (f === 'topup_type' || f === 'server_region') val = val || null;
        data[key] = val;
      }
    }
    if (req.body.images !== undefined) {
      data.images = Array.isArray(req.body.images) ? req.body.images : null;
    }
    const product = await prisma.product.update({ where: { id }, data, include: { category: true } });
    res.json(serializeProduct(product));
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Admin: xóa sản phẩm ──────────────────────────────
router.delete(['/admin/:id', '/:id'], requireAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.product.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Đã xóa sản phẩm' });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Admin: gói sản phẩm ───────────────────────────────
router.post('/admin/:productId/packages', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.productId);
    const { name, price, original_price, description, notes, image_url, delivery_type, sort_order, is_active,
      api_provider_id, external_product_id, external_plan_id, auto_markup, markup_percent } = req.body;
    const pkg = await prisma.productPackage.create({
      data: {
        productId, name,
        price: price || 0,
        originalPrice: original_price || null,
        description: description || null,
        notes: notes || null,
        imageUrl: image_url || null,
        deliveryType: delivery_type || 'manual',
        sortOrder: sort_order || 0,
        isActive: is_active !== false,
        apiProviderId: api_provider_id || null,
        externalProductId: external_product_id || null,
        externalPlanId: external_plan_id || null,
        autoMarkup: !!auto_markup,
        markupPercent: markup_percent != null ? markup_percent : null,
      },
    });
    res.status(201).json(pkg);
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.patch('/admin/packages/:id', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const pkg = await prisma.productPackage.update({
      where: { id },
      data: {
        name: req.body.name,
        price: req.body.price,
        originalPrice: req.body.original_price,
        description: req.body.description,
        deliveryType: req.body.delivery_type,
        isActive: req.body.is_active,
        sortOrder: req.body.sort_order,
        ...(req.body.api_provider_id !== undefined && { apiProviderId: req.body.api_provider_id || null }),
        ...(req.body.external_product_id !== undefined && { externalProductId: req.body.external_product_id || null }),
        ...(req.body.external_plan_id !== undefined && { externalPlanId: req.body.external_plan_id || null }),
        ...(req.body.auto_markup !== undefined && { autoMarkup: !!req.body.auto_markup }),
        ...(req.body.markup_percent !== undefined && { markupPercent: req.body.markup_percent }),
      },
    });
    res.json(pkg);
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.delete('/admin/packages/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.productPackage.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Đã xóa gói' });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Admin: TẤT CẢ gói của 1 sản phẩm (gồm gói ẩn) cho màn quản trị ──
router.get('/admin/:productId/packages', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.productId);
    const pkgs = await prisma.productPackage.findMany({
      where: { productId },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    res.json({
      items: pkgs.map((pkg: any) => ({
        id: pkg.id,
        name: pkg.name,
        price: money(pkg.price),
        originalPrice: pkg.originalPrice != null ? money(pkg.originalPrice) : null,
        deliveryType: pkg.deliveryType,
        isActive: pkg.isActive,
        sortOrder: pkg.sortOrder,
        stockQuantity: pkg.stockQuantity,
        isStockManaged: pkg.isStockManaged,
        apiProviderId: pkg.apiProviderId,
        externalProductId: pkg.externalProductId,
        externalPlanId: pkg.externalPlanId,
        autoMarkup: pkg.autoMarkup,
        markupPercent: pkg.markupPercent != null ? Number(pkg.markupPercent) : null,
      })),
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Admin: custom fields của gói (form nhập thông tin khi mua) ──
function fieldToDict(f: any) {
  return { id: f.id, field_name: f.fieldName, field_type: f.fieldType, is_required: f.isRequired, options: f.options, sort_order: f.sortOrder };
}

router.get('/admin/packages/:pkgId/fields', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const fields = await prisma.packageField.findMany({
      where: { packageId: parseInt(req.params.pkgId) },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    res.json(fields.map(fieldToDict));
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.post('/admin/packages/:pkgId/fields', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const pkgId = parseInt(req.params.pkgId);
    const pkg = await prisma.productPackage.findUnique({ where: { id: pkgId } });
    if (!pkg) { res.status(404).json({ detail: 'Không tìm thấy gói' }); return; }
    const { field_name, field_type, is_required, options, sort_order } = req.body;
    const field = await prisma.packageField.create({
      data: {
        packageId: pkgId,
        fieldName: field_name,
        fieldType: field_type || 'text',
        isRequired: is_required !== false,
        options: options || null,
        sortOrder: sort_order || 0,
      },
    });
    res.status(201).json(fieldToDict(field));
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.patch('/admin/fields/:id', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const { field_name, field_type, is_required, options, sort_order } = req.body;
    const field = await prisma.packageField.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(field_name !== undefined && { fieldName: field_name }),
        ...(field_type !== undefined && { fieldType: field_type }),
        ...(is_required !== undefined && { isRequired: is_required }),
        ...(options !== undefined && { options }),
        ...(sort_order !== undefined && { sortOrder: sort_order }),
      },
    });
    res.json(fieldToDict(field));
  } catch (e: any) {
    res.status(e.code === 'P2025' ? 404 : 500).json({ detail: e.message });
  }
});

router.delete('/admin/fields/:id', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.packageField.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Admin: xoá nhiều sản phẩm ──────────────────────────
router.post('/admin/bulk-delete', requireAdmin, async (req: Request, res: Response) => {
  try {
    const ids = (req.body.ids || []).map((x: any) => parseInt(x)).filter((n: number) => Number.isFinite(n));
    if (!ids.length) { res.status(400).json({ detail: 'ids required' }); return; }
    const r = await prisma.product.deleteMany({ where: { id: { in: ids } } });
    res.json({ ok: true, deleted: r.count });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Helper ─────────────────────────────────────────────
function serializeProduct(p: any, detailed = false): Record<string, any> {
  const revs = p.reviews || [];
  const ratingCount = revs.length;
  const ratingAvg = ratingCount
    ? Math.round((revs.reduce((a: number, r: any) => a + (r.rating || 0), 0) / ratingCount) * 10) / 10
    : 0;
  const packages = (p.packages || []).map((pkg: any) => {
    const flashSale = pkg.flashSales?.[0];
    return {
      id: pkg.id,
      name: pkg.name,
      price: money(pkg.price),
      originalPrice: pkg.originalPrice ? money(pkg.originalPrice) : null,
      description: pkg.description,
      notes: pkg.notes,
      imageUrl: pkg.imageUrl,
      deliveryType: pkg.deliveryType,
      isStockManaged: pkg.isStockManaged,
      stockQuantity: pkg.stockQuantity,
      sortOrder: pkg.sortOrder,
      isActive: pkg.isActive,
      flashSale: flashSale ? {
        salePrice: money(flashSale.salePrice),
        endsAt: flashSale.endsAt?.toISOString(),
        quantityLimit: flashSale.quantityLimit,
        quantitySold: flashSale.quantitySold,
      } : null,
      fields: detailed ? pkg.fields : undefined,
    };
  });

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    notes: p.notes,
    imageUrl: p.imageUrl,
    images: Array.isArray(p.images) ? p.images : [],
    isFeatured: p.isFeatured,
    isActive: p.isActive,
    sortOrder: p.sortOrder,
    categoryId: p.categoryId,
    category: p.category ? { id: p.category.id, name: p.category.name, slug: p.category.slug, productType: p.category.productType } : null,
    // Loại sản phẩm + thông tin topup (cho layout chi tiết riêng game/giftcard).
    productType: p.category?.productType || 'premium',
    topupType: p.topupType || null,
    serverRegion: p.serverRegion || null,
    packages,
    // Rating trung bình + số lượt (cho lọc theo sao ở trang gian hàng).
    rating: ratingAvg,
    ratingCount,
    soldCount: p._soldCount || 0,
    reviews: detailed ? (p.reviews || []) : undefined,
    createdAt: p.createdAt?.toISOString(),
  };
}

// ── Admin: IMPORT toàn bộ gói + trường tuỳ chỉnh từ nhà cung cấp (topup) ──
// Tạo các gói (api-linked) từ plans của 1 sản phẩm nguồn + áp markup, và gắn
// trường nhập (UID/server...) lấy từ provider cho từng gói.
router.post('/admin/:productId/import-packages', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.productId);
    const { api_provider_id, external_product_id, markup_percent, auto_markup } = req.body;
    if (!api_provider_id || !external_product_id) {
      res.status(422).json({ detail: 'Thiếu nhà cung cấp hoặc sản phẩm nguồn' });
      return;
    }
    const provider = await prisma.apiProvider.findUnique({ where: { id: Number(api_provider_id) } });
    if (!provider) { res.status(404).json({ detail: 'Không tìm thấy nhà cung cấp' }); return; }
    const adapter: any = getCatalogAdapter(provider);
    const remotes = await adapter.getProducts(String(external_product_id));
    const remote = remotes[0];
    if (!remote) { res.status(404).json({ detail: 'Không tìm thấy sản phẩm nguồn' }); return; }
    const mk = auto_markup ? Number(markup_percent) || 0 : 0;
    const applyMarkup = (p: number) => (auto_markup ? Math.round(p * (1 + mk / 100)) : p);
    // Topup: field chung theo category; Premium: field theo từng plan.
    const sharedFields = adapter.getFormFields ? await adapter.getFormFields(String(external_product_id)) : [];
    const existing = await prisma.productPackage.findMany({ where: { productId }, select: { externalPlanId: true } });
    const have = new Set(existing.map((x: any) => x.externalPlanId).filter(Boolean));
    let created = 0;
    for (const plan of remote.plans) {
      if (have.has(String(plan.id))) continue;
      const pkg = await prisma.productPackage.create({
        data: {
          productId,
          name: plan.name,
          price: applyMarkup(plan.sale_price ?? plan.price),
          deliveryType: 'api',
          apiProviderId: provider.id,
          externalProductId: String(external_product_id),
          externalPlanId: String(plan.id),
          autoMarkup: !!auto_markup,
          markupPercent: mk || null,
          isActive: true,
          sortOrder: created,
        },
      });
      const planFields: any[] = plan.fields?.length ? plan.fields : sharedFields;
      for (let i = 0; i < planFields.length; i++) {
        const f = planFields[i];
        await prisma.packageField.create({
          data: {
            packageId: pkg.id,
            fieldName: f.label || f.key,
            fieldType: f.type === 'select' ? 'select' : 'text',
            isRequired: f.required !== false,
            options: f.options?.length ? f.options.join('\n') : null,
            sortOrder: i,
          },
        });
      }
      created++;
    }
    res.json({ message: `Đã import ${created} gói từ nguồn`, created });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Admin: ĐỒNG BỘ GIÁ các gói api-linked từ nhà cung cấp (áp markup đã lưu) ──
router.post('/admin/:productId/sync-prices', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.productId);
    const pkgs = await prisma.productPackage.findMany({
      where: { productId, deliveryType: 'api', NOT: { apiProviderId: null } },
    });
    const cache: Record<string, any[]> = {};
    let updated = 0;
    for (const pkg of pkgs as any[]) {
      if (!pkg.apiProviderId || !pkg.externalProductId || !pkg.externalPlanId) continue;
      const provider = await prisma.apiProvider.findUnique({ where: { id: pkg.apiProviderId } });
      if (!provider) continue;
      const key = `${provider.id}:${pkg.externalProductId}`;
      if (!cache[key]) {
        const remotes = await getCatalogAdapter(provider).getProducts(String(pkg.externalProductId));
        cache[key] = remotes[0]?.plans || [];
      }
      const plan = cache[key].find((pl: any) => String(pl.id) === String(pkg.externalPlanId));
      if (!plan) continue;
      const base = plan.sale_price ?? plan.price;
      const newPrice = pkg.autoMarkup ? Math.round(base * (1 + (pkg.markupPercent || 0) / 100)) : base;
      await prisma.productPackage.update({ where: { id: pkg.id }, data: { price: newPrice } });
      updated++;
    }
    res.json({ message: `Đã đồng bộ giá ${updated} gói`, updated });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

export default router;
