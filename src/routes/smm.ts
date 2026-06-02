/**
 * SMM Panel Routes
 * Dịch vụ tăng tương tác mạng xã hội (like, follow, view...)
 *
 * Customer: catalog, đặt đơn, xem đơn, refill
 * Admin: quản lý platform / category / service / provider / đơn hàng
 */

import { Router, Request, Response } from 'express';
import slugify from 'slugify';
import prisma from '../db';
import { requireUser, requireAdmin } from '../middleware/auth';
import { money, genOrderCode } from '../services/orders';
import { getProvider } from '../services/providers';
import { notifySmmOrder } from '../services/telegram';

const router = Router();

// ════════════════════════════════════════════════════
// CUSTOMER-FACING
// ════════════════════════════════════════════════════

/** Catalog công khai: platforms → categories → services */
router.get('/catalog', async (_req: Request, res: Response) => {
  try {
    const platforms = await prisma.smmPlatform.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      include: {
        categories: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          include: {
            services: {
              where: { isActive: true },
              orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
            },
          },
        },
      },
    });

    const result = platforms
      .map((p: any) => {
        const categories = p.categories
          .filter((c: any) => c.services.length > 0)
          .map((c: any) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            services: c.services.map((s: any) => ({
              id: s.id,
              name: s.name,
              description: s.description,
              rate: s.rate,
              min_quantity: s.minQuantity,
              max_quantity: s.maxQuantity,
              can_refill: s.canRefill,
              can_cancel: s.canCancel,
              service_type: s.serviceType || 'Default',
              avg_time_minutes: s.avgTimeMinutes,
              sort_order: s.sortOrder || 0,
              display_id: s.sortOrder || s.id,
            })),
          }));
        return { id: p.id, name: p.name, slug: p.slug, icon_url: p.iconUrl, categories };
      })
      .filter((p: any) => p.categories.length > 0);

    res.json(result);
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

/** Chi tiết 1 dịch vụ */
router.get('/service/:sid', async (req: Request, res: Response) => {
  try {
    const svc = await prisma.smmService.findFirst({
      where: { id: parseInt(req.params.sid), isActive: true },
      include: { category: { include: { platform: true } } },
    });
    if (!svc) { res.status(404).json({ detail: 'Service not found' }); return; }
    res.json({
      id: svc.id,
      name: svc.name,
      description: svc.description,
      rate: svc.rate,
      min_quantity: svc.minQuantity,
      max_quantity: svc.maxQuantity,
      can_refill: svc.canRefill,
      can_cancel: svc.canCancel,
      service_type: svc.serviceType,
      category: svc.category ? { id: svc.category.id, name: svc.category.name, slug: svc.category.slug } : null,
      platform: svc.category?.platform
        ? { id: svc.category.platform.id, name: svc.category.platform.name, slug: svc.category.platform.slug, icon_url: svc.category.platform.iconUrl }
        : null,
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

/** Đặt đơn SMM (trừ số dư) */
router.post('/orders', requireUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { service_id, link, quantity: rawQty, extras: rawExtras, scheduled_at, repeat_count = 0, repeat_interval = 0 } = req.body;

    const svc = await prisma.smmService.findUnique({
      where: { id: service_id },
      include: { category: { include: { platform: true } }, apiProvider: true },
    });
    if (!svc || !svc.isActive) { res.status(404).json({ detail: 'Service not found or inactive' }); return; }

    let quantity = rawQty || 1;
    const extras: Record<string, any> = rawExtras || {};
    const stype = (svc.serviceType || 'Default').trim();

    // Xử lý theo loại dịch vụ
    if (stype === 'Package') {
      quantity = 1;
    } else if (stype === 'Custom Comments') {
      const lines = String(extras.comments || '').split('\n').map((l: string) => l.trim()).filter(Boolean);
      if (!lines.length) { res.status(400).json({ detail: 'Vui lòng nhập danh sách bình luận (mỗi dòng 1 bình luận)' }); return; }
      quantity = lines.length;
      extras.comments = lines.join('\n');
    } else if (stype === 'Mentions Hashtag') {
      if (!String(extras.hashtags || '').trim()) { res.status(400).json({ detail: 'Vui lòng nhập hashtag' }); return; }
    } else if (stype === 'SEO') {
      if (!String(extras.keywords || '').trim()) { res.status(400).json({ detail: 'Vui lòng nhập từ khoá SEO' }); return; }
    }

    if (quantity < svc.minQuantity || quantity > svc.maxQuantity) {
      res.status(400).json({ detail: `Số lượng phải từ ${svc.minQuantity} đến ${svc.maxQuantity}` });
      return;
    }

    // Validate link
    const linkRaw = String(link || '').trim();
    if (linkRaw.length < 4 || linkRaw.length > 2048) { res.status(400).json({ detail: 'Link không hợp lệ' }); return; }
    try {
      const u = new URL(linkRaw);
      if (!['http:', 'https:'].includes(u.protocol) || !u.host.includes('.')) {
        res.status(400).json({ detail: 'Link phải là URL http(s) hợp lệ' });
        return;
      }
    } catch {
      res.status(400).json({ detail: 'Link phải là URL http(s) hợp lệ' });
      return;
    }

    // Tính tiền (subtotal + VAT)
    const subtotal = Math.round((svc.rate * quantity / 1000) * 100) / 100;
    const taxCfg = await prisma.siteConfig.findUnique({ where: { key: 'tax_rate' } });
    const taxRate = taxCfg ? parseFloat(taxCfg.value || '0') : 0;
    const taxAmount = Math.round(subtotal * taxRate / 100 * 100) / 100;
    const charge = Math.round((subtotal + taxAmount) * 100) / 100;

    // Đặt đơn trong transaction (khóa số dư)
    const result = await prisma.$transaction(async (tx: any) => {
      const dbUser = await tx.user.findUnique({ where: { id: user.user_id } });
      if (!dbUser) throw new Error('User not found');
      const balance = money(dbUser.balance);
      if (balance < charge) {
        throw Object.assign(new Error(`Số dư không đủ. Cần ${charge.toLocaleString()}, hiện có ${balance.toLocaleString()}`), { statusCode: 400 });
      }

      // Trừ số dư
      await tx.user.update({ where: { id: dbUser.id }, data: { balance: balance - charge } });
      await tx.balanceTransaction.create({
        data: {
          userId: dbUser.id,
          amount: -charge,
          balanceAfter: balance - charge,
          type: 'purchase',
          status: 'completed',
          description: `Đơn SMM: ${svc.name}`,
        },
      });

      const schedDt = scheduled_at ? new Date(scheduled_at) : null;
      const order = await tx.smmOrder.create({
        data: {
          orderCode: genOrderCode(),
          userId: dbUser.id,
          smmServiceId: svc.id,
          platformName: svc.category?.platform?.name || '',
          categoryName: svc.category?.name || '',
          serviceName: svc.name,
          link: linkRaw,
          quantity,
          charge,
          serviceType: svc.serviceType || 'Default',
          extras: Object.keys(extras).length ? JSON.stringify(extras) : null,
          deliveryType: svc.deliveryType,
          apiProviderId: svc.apiProviderId,
          scheduledAt: schedDt,
          repeatCount: repeat_count,
          repeatInterval: repeat_interval,
          repeatRemaining: repeat_count,
          status: schedDt ? 'scheduled' : 'pending',
        },
      });
      return order;
    });

    // Nếu API delivery và không scheduled → gửi đơn tới provider ngay
    if (result.status === 'pending' && svc.deliveryType === 'api' && svc.apiProvider && svc.externalServiceId) {
      try {
        const adapter = getProvider(svc.apiProvider);
        const apiResult = await adapter.createOrder(svc.externalServiceId, linkRaw, quantity, extras);
        if (apiResult.orderId) {
          await prisma.smmOrder.update({
            where: { id: result.id },
            data: { externalOrderId: apiResult.orderId, status: apiResult.status },
          });
        } else {
          // Thất bại → hoàn tiền
          await refundSmmOrder(result.id, user.user_id, charge, `API error: ${apiResult.message}`);
        }
      } catch (e: any) {
        await refundSmmOrder(result.id, user.user_id, charge, `API error: ${e.message}`);
      }
    }

    notifySmmOrder(result.orderCode, svc.name, charge).catch(() => {});
    const final = await prisma.smmOrder.findUnique({ where: { id: result.id } });
    res.json({
      id: final!.id,
      order_code: final!.orderCode,
      status: final!.status,
      charge: money(final!.charge),
      external_order_id: final!.externalOrderId,
      scheduled_at: final!.scheduledAt?.toISOString(),
      repeat_count: final!.repeatCount,
      repeat_remaining: final!.repeatRemaining,
    });
  } catch (e: any) {
    res.status(e.statusCode || 500).json({ detail: e.message });
  }
});

/** Danh sách đơn SMM của user */
router.get('/orders', requireUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const status = req.query.status as string;
    const search = req.query.search as string;

    const where: any = { userId: user.user_id };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { orderCode: { contains: search, mode: 'insensitive' } },
        { link: { contains: search, mode: 'insensitive' } },
        { serviceName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, orders] = await Promise.all([
      prisma.smmOrder.count({ where }),
      prisma.smmOrder.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { smmService: true },
      }),
    ]);

    res.json({
      total,
      page,
      orders: orders.map((o: any) => ({
        id: o.id,
        order_code: o.orderCode,
        platform_name: o.platformName,
        category_name: o.categoryName,
        service_name: o.serviceName,
        link: o.link,
        quantity: o.quantity,
        charge: money(o.charge),
        status: o.status,
        delivery_type: o.deliveryType,
        service_type: o.serviceType || 'Default',
        external_order_id: o.externalOrderId,
        start_count: o.startCount,
        remains: o.remains,
        can_refill: o.smmService?.canRefill || false,
        refill_id: o.refillId,
        refill_status: o.refillStatus,
        scheduled_at: o.scheduledAt?.toISOString(),
        repeat_count: o.repeatCount || 0,
        repeat_remaining: o.repeatRemaining || 0,
        created_at: o.createdAt?.toISOString(),
      })),
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

/** Chi tiết 1 đơn SMM */
router.get('/orders/:oid', requireUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const order = await prisma.smmOrder.findFirst({
      where: { id: parseInt(req.params.oid), userId: user.user_id },
      include: { smmService: true },
    });
    if (!order) { res.status(404).json({ detail: 'Không tìm thấy đơn' }); return; }
    res.json({
      id: order.id,
      order_code: order.orderCode,
      platform_name: order.platformName,
      service_name: order.serviceName,
      link: order.link,
      quantity: order.quantity,
      charge: money(order.charge),
      status: order.status,
      start_count: order.startCount,
      remains: order.remains,
      external_order_id: order.externalOrderId,
      created_at: order.createdAt?.toISOString(),
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

/** Yêu cầu refill */
router.post('/orders/:oid/refill', requireUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const order = await prisma.smmOrder.findFirst({
      where: { id: parseInt(req.params.oid), userId: user.user_id },
      include: { smmService: true, apiProvider: true },
    });
    if (!order) { res.status(404).json({ detail: 'Không tìm thấy đơn' }); return; }
    if (!order.smmService?.canRefill) { res.status(400).json({ detail: 'Dịch vụ không hỗ trợ refill' }); return; }
    if (order.deliveryType !== 'api' || !order.apiProvider || !order.externalOrderId) {
      res.status(400).json({ detail: 'Đơn không thể refill tự động' });
      return;
    }
    const adapter = getProvider(order.apiProvider);
    const result = await adapter.createRefill(order.externalOrderId);
    const refillId = result?.refill ? String(result.refill) : null;
    await prisma.smmOrder.update({
      where: { id: order.id },
      data: { refillId, refillStatus: refillId ? 'pending' : 'failed' },
    });
    res.json({ refill_id: refillId, status: refillId ? 'pending' : 'failed' });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

/** Trạng thái refill */
router.get('/orders/:oid/refill-status', requireUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const order = await prisma.smmOrder.findFirst({
      where: { id: parseInt(req.params.oid), userId: user.user_id },
      include: { apiProvider: true },
    });
    if (!order) { res.status(404).json({ detail: 'Order not found' }); return; }
    if (!order.refillId && !order.refillStatus) { res.json({ refill_status: null }); return; }

    if (order.deliveryType === 'api' && order.refillId && order.apiProvider) {
      try {
        const adapter = getProvider(order.apiProvider);
        const result = await adapter.getRefillStatus(order.refillId);
        const newStatus = result?.status || order.refillStatus;
        await prisma.smmOrder.update({ where: { id: order.id }, data: { refillStatus: newStatus } });
        res.json({ refill_id: order.refillId, refill_status: newStatus });
        return;
      } catch { /* fall through to cached */ }
    }
    res.json({ refill_id: order.refillId, refill_status: order.refillStatus });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

/** Danh sách bảo hành / refill của user */
router.get('/warranty', requireUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const status = req.query.status as string;
    const search = req.query.search as string;

    const where: any = { userId: user.user_id, refillStatus: { not: null } };
    if (status) where.refillStatus = status;
    if (search) {
      where.OR = [
        { orderCode: { contains: search, mode: 'insensitive' } },
        { refillId: { contains: search, mode: 'insensitive' } },
        { serviceName: { contains: search, mode: 'insensitive' } },
        { link: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.smmOrder.count({ where }),
      prisma.smmOrder.findMany({ where, orderBy: { updatedAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    ]);

    res.json({
      total,
      page,
      items: rows.map((o: any) => ({
        order_id: o.id,
        order_code: o.orderCode,
        service_name: o.serviceName,
        link: o.link,
        refill_id: o.refillId,
        refill_status: o.refillStatus,
        updated_at: o.updatedAt?.toISOString(),
      })),
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ════════════════════════════════════════════════════
// ADMIN — PLATFORMS
// ════════════════════════════════════════════════════

router.get('/platforms', requireAdmin, async (_req: Request, res: Response) => {
  const items = await prisma.smmPlatform.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] });
  res.json(items);
});

router.post('/platforms', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, icon_url, sort_order, is_active } = req.body;
    const slug = slugify(name, { lower: true, strict: true });
    const item = await prisma.smmPlatform.create({
      data: { name, slug, iconUrl: icon_url || null, sortOrder: sort_order || 0, isActive: is_active !== false },
    });
    res.status(201).json(item);
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.put('/platforms/:pid', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, icon_url, sort_order, is_active } = req.body;
    const item = await prisma.smmPlatform.update({
      where: { id: parseInt(req.params.pid) },
      data: {
        ...(name && { name }),
        ...(icon_url !== undefined && { iconUrl: icon_url }),
        ...(sort_order !== undefined && { sortOrder: sort_order }),
        ...(is_active !== undefined && { isActive: is_active }),
      },
    });
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.delete('/platforms/:pid', requireAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.smmPlatform.delete({ where: { id: parseInt(req.params.pid) } });
    res.json({ message: 'Đã xóa platform' });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ════════════════════════════════════════════════════
// ADMIN — CATEGORIES
// ════════════════════════════════════════════════════

router.get('/categories/all', requireAdmin, async (_req: Request, res: Response) => {
  const items = await prisma.smmCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    include: { platform: true },
  });
  res.json(items);
});

router.get('/platforms/:pid/categories', requireAdmin, async (req: Request, res: Response) => {
  const items = await prisma.smmCategory.findMany({
    where: { platformId: parseInt(req.params.pid) },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  });
  res.json(items);
});

router.post('/platforms/:pid/categories', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, sort_order, is_active } = req.body;
    const slug = slugify(`${name}-${Date.now()}`, { lower: true, strict: true });
    const item = await prisma.smmCategory.create({
      data: { platformId: parseInt(req.params.pid), name, slug, sortOrder: sort_order || 0, isActive: is_active !== false },
    });
    res.status(201).json(item);
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.put('/categories/:cid', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, sort_order, is_active } = req.body;
    const item = await prisma.smmCategory.update({
      where: { id: parseInt(req.params.cid) },
      data: { ...(name && { name }), ...(sort_order !== undefined && { sortOrder: sort_order }), ...(is_active !== undefined && { isActive: is_active }) },
    });
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.delete('/categories/:cid', requireAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.smmCategory.delete({ where: { id: parseInt(req.params.cid) } });
    res.json({ message: 'Đã xóa danh mục' });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ════════════════════════════════════════════════════
// ADMIN — SERVICES
// ════════════════════════════════════════════════════

router.get('/categories/:cid/services', requireAdmin, async (req: Request, res: Response) => {
  const items = await prisma.smmService.findMany({
    where: { categoryId: parseInt(req.params.cid) },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  });
  res.json(items);
});

router.get('/services/all', requireAdmin, async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const [total, items] = await Promise.all([
    prisma.smmService.count(),
    prisma.smmService.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: { category: { include: { platform: true } } },
    }),
  ]);
  res.json({ total, page, items });
});

router.post('/categories/:cid/services', requireAdmin, async (req: Request, res: Response) => {
  try {
    const b = req.body;
    const item = await prisma.smmService.create({
      data: {
        categoryId: parseInt(req.params.cid),
        name: b.name,
        description: b.description || null,
        rate: b.rate || 0,
        minQuantity: b.min_quantity || 1,
        maxQuantity: b.max_quantity || 10000,
        deliveryType: b.delivery_type || 'manual',
        apiProviderId: b.api_provider_id || null,
        externalServiceId: b.external_service_id || null,
        canRefill: b.can_refill || false,
        canCancel: b.can_cancel || false,
        serviceType: b.service_type || 'Default',
        costRate: b.cost_rate || 0,
        isActive: b.is_active !== false,
        sortOrder: b.sort_order || 0,
      },
    });
    res.status(201).json(item);
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.put('/services/:sid', requireAdmin, async (req: Request, res: Response) => {
  try {
    const b = req.body;
    const item = await prisma.smmService.update({
      where: { id: parseInt(req.params.sid) },
      data: {
        ...(b.name && { name: b.name }),
        ...(b.description !== undefined && { description: b.description }),
        ...(b.rate !== undefined && { rate: b.rate }),
        ...(b.min_quantity !== undefined && { minQuantity: b.min_quantity }),
        ...(b.max_quantity !== undefined && { maxQuantity: b.max_quantity }),
        ...(b.delivery_type && { deliveryType: b.delivery_type }),
        ...(b.can_refill !== undefined && { canRefill: b.can_refill }),
        ...(b.service_type && { serviceType: b.service_type }),
        ...(b.is_active !== undefined && { isActive: b.is_active }),
        ...(b.sort_order !== undefined && { sortOrder: b.sort_order }),
      },
    });
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.patch('/services/:sid/active', requireAdmin, async (req: Request, res: Response) => {
  try {
    const item = await prisma.smmService.update({
      where: { id: parseInt(req.params.sid) },
      data: { isActive: req.body.is_active },
    });
    res.json({ id: item.id, is_active: item.isActive });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.delete('/services/:sid', requireAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.smmService.delete({ where: { id: parseInt(req.params.sid) } });
    res.json({ message: 'Đã xóa dịch vụ' });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ════════════════════════════════════════════════════
// ADMIN — PROVIDERS (API nhà cung cấp)
// ════════════════════════════════════════════════════

router.get('/providers', requireAdmin, async (_req: Request, res: Response) => {
  const items = await prisma.apiProvider.findMany({
    where: { providerType: 'smm_panel' },
    orderBy: { id: 'desc' },
  });
  // Ẩn api_key
  res.json(items.map((p: any) => ({ ...p, apiKey: p.apiKey ? '••••••••' : '' })));
});

router.post('/providers', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, base_url, api_key } = req.body;
    const item = await prisma.apiProvider.create({
      data: { name, providerType: 'smm_panel', baseUrl: base_url, apiKey: api_key, isActive: true },
    });
    res.status(201).json({ ...item, apiKey: '••••••••' });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.get('/providers/:pid/balance', requireAdmin, async (req: Request, res: Response) => {
  try {
    const provider = await prisma.apiProvider.findUnique({ where: { id: parseInt(req.params.pid) } });
    if (!provider) { res.status(404).json({ detail: 'Provider not found' }); return; }
    const adapter = getProvider(provider);
    const balance = await adapter.getBalance();
    res.json(balance);
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

/** Lấy danh sách dịch vụ từ panel của provider (để admin chọn import) */
router.get('/providers/:pid/remote-services', requireAdmin, async (req: Request, res: Response) => {
  try {
    const provider = await prisma.apiProvider.findUnique({ where: { id: parseInt(req.params.pid) } });
    if (!provider) { res.status(404).json({ detail: 'Provider not found' }); return; }
    const adapter = getProvider(provider);
    const services = await adapter.getServices();
    res.json({ total: services.length, services });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ════════════════════════════════════════════════════
// ADMIN — ORDERS
// ════════════════════════════════════════════════════

router.get('/admin/orders', requireAdmin, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const status = req.query.status as string;
    const where: any = {};
    if (status) where.status = status;
    const [total, orders] = await Promise.all([
      prisma.smmOrder.count({ where }),
      prisma.smmOrder.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { email: true } } },
      }),
    ]);
    res.json({
      total,
      page,
      orders: orders.map((o: any) => ({
        id: o.id,
        order_code: o.orderCode,
        user_email: o.user?.email,
        service_name: o.serviceName,
        link: o.link,
        quantity: o.quantity,
        charge: money(o.charge),
        status: o.status,
        delivery_type: o.deliveryType,
        external_order_id: o.externalOrderId,
        created_at: o.createdAt?.toISOString(),
      })),
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.put('/admin/orders/:oid/status', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { status, start_count, remains, admin_notes } = req.body;
    const item = await prisma.smmOrder.update({
      where: { id: parseInt(req.params.oid) },
      data: {
        ...(status && { status }),
        ...(start_count !== undefined && { startCount: start_count }),
        ...(remains !== undefined && { remains }),
        ...(admin_notes !== undefined && { adminNotes: admin_notes }),
      },
    });
    res.json({ id: item.id, status: item.status });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

/** Đồng bộ trạng thái 1 đơn từ provider */
router.post('/admin/orders/:oid/check', requireAdmin, async (req: Request, res: Response) => {
  try {
    const order = await prisma.smmOrder.findUnique({
      where: { id: parseInt(req.params.oid) },
      include: { apiProvider: true },
    });
    if (!order) { res.status(404).json({ detail: 'Không tìm thấy đơn' }); return; }
    if (order.deliveryType !== 'api' || !order.apiProvider || !order.externalOrderId) {
      res.status(400).json({ detail: 'Đơn không phải API delivery' });
      return;
    }
    const adapter = getProvider(order.apiProvider);
    const result = await adapter.getOrderStatus(order.externalOrderId);
    const data = result.deliveryData ? JSON.parse(result.deliveryData) : {};
    const updated = await prisma.smmOrder.update({
      where: { id: order.id },
      data: {
        status: result.status,
        startCount: data.start_count ? parseInt(data.start_count) : order.startCount,
        remains: data.remains !== undefined ? parseInt(data.remains) : order.remains,
      },
    });
    res.json({ id: updated.id, status: updated.status, start_count: updated.startCount, remains: updated.remains });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ════════════════════════════════════════════════════
// HELPER
// ════════════════════════════════════════════════════

async function refundSmmOrder(orderId: number, userId: number, amount: number, reason: string): Promise<void> {
  await prisma.$transaction(async (tx: any) => {
    const dbUser = await tx.user.findUnique({ where: { id: userId } });
    if (!dbUser) return;
    const newBalance = money(dbUser.balance) + amount;
    await tx.user.update({ where: { id: userId }, data: { balance: newBalance } });
    await tx.balanceTransaction.create({
      data: {
        userId,
        amount,
        balanceAfter: newBalance,
        type: 'refund',
        status: 'completed',
        description: `Hoàn tiền đơn SMM #${orderId}: ${reason}`,
      },
    });
    await tx.smmOrder.update({
      where: { id: orderId },
      data: { status: 'failed', adminNotes: `[REFUNDED] +${amount.toLocaleString()} | ${reason}` },
    });
  });
}

export default router;
