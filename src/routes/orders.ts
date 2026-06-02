import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireUser, requireAdmin, requireStaffOrAdmin } from '../middleware/auth';
import { orderToDict, genOrderCode, applyCoupon, autoDeliver, money } from '../services/orders';
import { notifyNewOrder } from '../services/telegram';
import { createNotification } from '../services/notify';
import { awardPointsForOrder, estimatePointDiscount, redeemPointsForOrder, refundPointsForOrder } from '../services/loyalty';

const router = Router();

const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ thanh toán', pending_payment: 'Chờ thanh toán', paid: 'Đã thanh toán',
  processing: 'Đang xử lý', completed: 'Đã giao hàng', cancelled: 'Đã hủy',
  failed: 'Lỗi / đã hoàn tiền', refunded: 'Đã hoàn tiền',
};

// ── Lấy đơn hàng của user ──────────────────────────────
router.get('/my', requireUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const [total, orders] = await Promise.all([
      prisma.order.count({ where: { userId: user.user_id.toString() } }),
      prisma.order.findMany({
        where: { userId: user.user_id.toString() },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          package: { include: { product: true } },
          items: { include: { package: { include: { product: true } } } },
        },
      }),
    ]);

    res.json({ total, page, items: orders.map(orderToDict) });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Chi tiết đơn hàng ──────────────────────────────────
router.get('/my/:order_code', requireUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const order = await prisma.order.findFirst({
      where: { orderCode: req.params.order_code, userId: user.user_id.toString() },
      include: {
        package: { include: { product: true } },
        items: { include: { package: { include: { product: true } } } },
      },
    });
    if (!order) { res.status(404).json({ detail: 'Không tìm thấy đơn hàng' }); return; }
    res.json(orderToDict(order));
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Tạo đơn hàng ──────────────────────────────────────
// Hỗ trợ cả '/' và '/create' (frontend gọi /orders/create)
router.post(['/', '/create'], requireUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { items, coupon_code, payment_method = 'sepay', notes, custom_fields_data } = req.body;
    const redeemPoints = Math.max(0, parseInt(req.body.redeem_points) || 0);

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(422).json({ detail: 'Cần ít nhất 1 sản phẩm' });
      return;
    }

    // Validate packages
    const packageIds = items.map((i: any) => i.package_id);
    const packages = await prisma.productPackage.findMany({
      where: { id: { in: packageIds }, isActive: true },
      include: { product: true, flashSales: { where: { isActive: true, startsAt: { lte: new Date() }, endsAt: { gte: new Date() } } } },
    });

    const pkgMap = new Map<number, any>(packages.map((p: any) => [p.id, p] as [number, any]));

    let subtotal = 0;
    const orderItemsData: any[] = [];

    for (const item of items) {
      const pkg = pkgMap.get(item.package_id);
      if (!pkg) {
        res.status(400).json({ detail: `Không tìm thấy gói ${item.package_id}` });
        return;
      }
      const qty = item.quantity || 1;
      const flashSale = pkg.flashSales[0];
      const unitPrice = flashSale ? money(flashSale.salePrice) : money(pkg.price);
      const lineTotal = unitPrice * qty;
      subtotal += lineTotal;

      orderItemsData.push({
        packageId: pkg.id,
        productNameSnapshot: pkg.product?.name,
        packageNameSnapshot: pkg.name,
        productImgSnapshot: pkg.product?.imageUrl,
        quantity: qty,
        unitPrice,
        lineTotal,
        customFieldsData: item.custom_fields || null,
      });
    }

    // Apply coupon
    let discountAmount = 0;
    let couponId: number | null = null;
    if (coupon_code) {
      const result = await applyCoupon(coupon_code, user.user_id.toString(), subtotal);
      if (result) {
        discountAmount = result.discount;
        couponId = result.couponId;
      }
    }

    // Get tax rate
    const taxConfig = await prisma.siteConfig.findUnique({ where: { key: 'tax_rate' } });
    const taxRate = taxConfig ? parseFloat(taxConfig.value || '0') : 0;
    const taxableAmount = subtotal - discountAmount;
    // Làm tròn về số nguyên đồng (VND không có phần lẻ) -> tránh sai số float
    const taxAmount = Math.round(taxableAmount * (taxRate / 100));
    const totalAmount = Math.round(taxableAmount + taxAmount);

    // Ước lượng giảm giá từ đổi điểm (số trừ thật sẽ atomic trong transaction)
    const estPointDiscount = redeemPoints > 0
      ? await estimatePointDiscount(user.user_id, redeemPoints, totalAmount)
      : 0;

    // Balance payment
    if (payment_method === 'balance') {
      const dbUser = await prisma.user.findUnique({ where: { id: user.user_id } });
      if (!dbUser || money(dbUser.balance) < Math.max(0, totalAmount - estPointDiscount)) {
        res.status(400).json({ detail: 'Số dư không đủ' });
        return;
      }
    }

    const orderCode = genOrderCode();
    const isSingleItem = orderItemsData.length === 1;

    const order = await prisma.$transaction(async (tx: any) => {
      // Đổi điểm (atomic) -> giảm trừ vào tổng phải trả
      let pointDiscount = 0;
      let pointsUsed = 0;
      if (redeemPoints > 0) {
        const r = await redeemPointsForOrder(tx, user.user_id, redeemPoints, totalAmount, orderCode);
        pointDiscount = r.discount;
        pointsUsed = r.used;
      }
      const payable = Math.max(0, totalAmount - pointDiscount);

      const newOrder = await tx.order.create({
        data: {
          orderCode,
          userId: user.user_id.toString(),
          userEmail: user.email,
          packageId: isSingleItem ? orderItemsData[0].packageId : null,
          quantity: isSingleItem ? orderItemsData[0].quantity : 1,
          subtotalAmount: subtotal,
          discountAmount: discountAmount + pointDiscount,
          taxAmount,
          totalAmount: payable,
          couponCode: coupon_code || null,
          status: payment_method === 'balance' ? 'paid' : 'pending',
          paymentMethod: payment_method,
          customFieldsData: isSingleItem ? orderItemsData[0].customFieldsData : custom_fields_data || null,
          notes: pointsUsed > 0 ? `${notes ? notes + ' | ' : ''}Đã đổi ${pointsUsed} điểm (-${pointDiscount.toLocaleString()}đ)` : (notes || null),
        },
      });

      if (orderItemsData.length > 1) {
        await tx.orderItem.createMany({
          data: orderItemsData.map((item) => ({ ...item, orderId: newOrder.id })),
        });
      }

      if (couponId) {
        const c = await tx.giftCode.findUnique({ where: { id: couponId } });
        if (c) {
          // Tăng usageCount có điều kiện để chống vượt usageLimit khi đặt đồng thời
          if (c.usageLimit > 0) {
            const ok = await tx.giftCode.updateMany({
              where: { id: couponId, usageCount: { lt: c.usageLimit } },
              data: { usageCount: { increment: 1 } },
            });
            if (ok.count === 0) throw new Error('COUPON_LIMIT');
          } else {
            await tx.giftCode.update({ where: { id: couponId }, data: { usageCount: { increment: 1 } } });
          }
          // Re-check giới hạn theo người dùng ngay trong transaction
          if (c.perUserLimit > 0) {
            const used = await tx.giftCodeUsage.count({ where: { codeId: couponId, userId: user.user_id.toString() } });
            if (used >= c.perUserLimit) throw new Error('COUPON_USER_LIMIT');
          }
          await tx.giftCodeUsage.create({ data: { codeId: couponId, userId: user.user_id.toString() } });
        }
      }

      if (payment_method === 'balance') {
        // Trừ tiền có điều kiện (atomic) — chống race khi 2 đơn cùng lúc làm âm ví
        const deducted = await tx.user.updateMany({
          where: { id: user.user_id, balance: { gte: payable } },
          data: { balance: { decrement: payable } },
        });
        if (deducted.count === 0) {
          throw new Error('INSUFFICIENT_BALANCE');
        }
        const dbUser = await tx.user.findUnique({ where: { id: user.user_id } });
        await tx.balanceTransaction.create({
          data: {
            userId: user.user_id,
            amount: -payable,
            balanceAfter: money(dbUser?.balance),
            type: 'purchase',
            status: 'completed',
            reference: orderCode,
            description: `Thanh toán đơn hàng ${orderCode}`,
          },
        });
      }

      return newOrder;
    });

    if (payment_method === 'balance') {
      await autoDeliver(order.id);
    }

    const result = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        package: { include: { product: true } },
        items: { include: { package: { include: { product: true } } } },
      },
    });

    notifyNewOrder(order.id).catch(() => {}); // Telegram thông báo (không chặn response)
    res.status(201).json(orderToDict(result!));
  } catch (e: any) {
    if (e?.message === 'INSUFFICIENT_BALANCE') {
      res.status(400).json({ detail: 'Số dư không đủ' });
      return;
    }
    if (e?.message === 'COUPON_LIMIT') {
      res.status(400).json({ detail: 'Mã giảm giá đã hết lượt sử dụng' });
      return;
    }
    if (e?.message === 'COUPON_USER_LIMIT') {
      res.status(400).json({ detail: 'Bạn đã dùng hết lượt cho mã giảm giá này' });
      return;
    }
    res.status(500).json({ detail: e.message });
  }
});

// ── Hủy đơn hàng ──────────────────────────────────────
router.post('/my/:order_code/cancel', requireUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const order = await prisma.order.findFirst({
      where: { orderCode: req.params.order_code, userId: user.user_id.toString() },
    });
    if (!order) { res.status(404).json({ detail: 'Không tìm thấy đơn hàng' }); return; }
    if (!['pending', 'pending_payment'].includes(order.status)) {
      res.status(400).json({ detail: 'Chỉ hủy được đơn đang chờ thanh toán' });
      return;
    }
    await prisma.order.update({ where: { id: order.id }, data: { status: 'cancelled' } });
    refundPointsForOrder(order.userId, order.orderCode).catch(() => {}); // hoàn điểm đã đổi (nếu có)
    res.json({ message: 'Đã hủy đơn hàng' });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Kiểm tra mã giảm giá ───────────────────────────────
router.post('/check-coupon', requireUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { coupon_code, subtotal } = req.body;
    const result = await applyCoupon(coupon_code, user.user_id.toString(), subtotal || 0);
    if (!result) {
      res.status(400).json({ detail: 'Mã giảm giá không hợp lệ hoặc đã hết hạn' });
      return;
    }
    res.json({ discount: result.discount, coupon_id: result.couponId });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Admin: list tất cả đơn hàng ───────────────────────
router.get('/admin/all', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const status = req.query.status as string;
    const search = req.query.search as string;

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { orderCode: { contains: search, mode: 'insensitive' } },
        { userEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          package: { include: { product: true } },
          items: { include: { package: { include: { product: true } } } },
        },
      }),
    ]);

    res.json({ total, page, items: orders.map(orderToDict) });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Admin: cập nhật trạng thái ────────────────────────
const VALID_ORDER_STATUSES = ['pending', 'pending_payment', 'paid', 'processing', 'completed', 'cancelled', 'failed', 'refunded'];

router.patch('/admin/:order_code/status', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const { status, delivery_data, notes } = req.body;
    if (!status || !VALID_ORDER_STATUSES.includes(status)) {
      res.status(400).json({ detail: `Trạng thái không hợp lệ. Cho phép: ${VALID_ORDER_STATUSES.join(', ')}` });
      return;
    }
    const order = await prisma.order.findUnique({ where: { orderCode: req.params.order_code } });
    if (!order) { res.status(404).json({ detail: 'Không tìm thấy đơn hàng' }); return; }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status, ...(delivery_data && { deliveryData: delivery_data }), ...(notes && { notes }) },
    });

    if (status === 'paid') {
      await autoDeliver(order.id);
    }

    // Thông báo cho khách + tích điểm khi giao xong (không chặn nếu lỗi)
    if (order.status !== status) {
      createNotification(order.userId, {
        type: 'order',
        title: `Đơn ${order.orderCode}: ${STATUS_LABELS[status] || status}`,
        body: notes || undefined,
        link: `/orders/${order.orderCode}`,
      }).catch(() => {});
      if (status === 'completed') {
        awardPointsForOrder(order.userId, money(order.totalAmount), order.orderCode).catch(() => {});
      }
      // Hoàn điểm đã đổi khi đơn bị hủy / hoàn tiền / thất bại
      if (['cancelled', 'refunded', 'failed'].includes(status)) {
        refundPointsForOrder(order.userId, order.orderCode).catch(() => {});
      }
    }

    res.json({ message: 'Đã cập nhật', status: updated.status });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Admin: xóa hàng loạt ───────────────────────────────
router.post('/admin/bulk-delete', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const ids = (req.body.ids || []).map((i: any) => parseInt(i));
    await prisma.order.deleteMany({ where: { id: { in: ids } } });
    res.json({ deleted: ids.length });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Admin: giao hàng thủ công ──────────────────────────
router.post('/admin/:order_code/deliver', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const { delivery_data } = req.body;
    const order = await prisma.order.findUnique({ where: { orderCode: req.params.order_code } });
    if (!order) { res.status(404).json({ detail: 'Không tìm thấy đơn hàng' }); return; }
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: 'completed', deliveryData: delivery_data || order.deliveryData },
    });
    await prisma.orderItem.updateMany({ where: { orderId: order.id }, data: { status: 'completed' } });
    res.json({ message: 'Đã giao hàng', status: updated.status });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Admin: xóa 1 đơn ───────────────────────────────────
router.delete('/admin/:order_code', requireAdmin, async (req: Request, res: Response) => {
  try {
    const order = await prisma.order.findUnique({ where: { orderCode: req.params.order_code } });
    if (!order) { res.status(404).json({ detail: 'Không tìm thấy' }); return; }
    await prisma.order.delete({ where: { id: order.id } });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Admin: hủy đơn ─────────────────────────────────────
router.post('/admin/:order_code/cancel', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const order = await prisma.order.findUnique({ where: { orderCode: req.params.order_code } });
    if (!order) { res.status(404).json({ detail: 'Không tìm thấy' }); return; }
    await prisma.order.update({ where: { id: order.id }, data: { status: 'cancelled' } });
    refundPointsForOrder(order.userId, order.orderCode).catch(() => {}); // hoàn điểm đã đổi (nếu có)
    res.json({ message: 'Đã hủy đơn' });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

export default router;
