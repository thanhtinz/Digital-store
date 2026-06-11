import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireUser, requireAdmin, requireStaffOrAdmin } from '../middleware/auth';
import { orderToDict, genOrderCode, applyCoupon, autoDeliver, money, refundOrderBalance, maybeSendGiftEmail, onOrderCompleted } from '../services/orders';
import { issueSourceForOrder } from '../services/source';
import { notifyNewOrder } from '../services/telegram';
import { createNotification } from '../services/notify';
import { sendMail } from '../services/mail';
import { awardPointsForOrder, estimatePointDiscount, redeemPointsForOrder, refundPointsForOrder } from '../services/loyalty';

const router = Router();

const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ thanh toán', pending_payment: 'Chờ thanh toán', paid: 'Đã thanh toán',
  processing: 'Đang xử lý', completed: 'Đã giao hàng', cancelled: 'Đã hủy',
  failed: 'Lỗi / đã hoàn tiền', refunded: 'Đã hoàn tiền',
};

// Email thông báo cập nhật trạng thái đơn (không chặn nếu lỗi/chưa cấu hình mail).
function sendOrderStatusEmail(toEmail: string | null | undefined, orderCode: string, status: string) {
  if (!toEmail) return;
  const label = STATUS_LABELS[status] || status;
  const url = `${process.env.PUBLIC_SITE_URL || ''}/dashboard/orders/${orderCode}`;
  const subject = `Đơn hàng ${orderCode} — ${label}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
      <h2 style="margin:0 0 8px">Cập nhật đơn hàng</h2>
      <p>Đơn hàng <b>#${orderCode}</b> của bạn đã chuyển sang trạng thái: <b>${label}</b>.</p>
      <p><a href="${url}" style="display:inline-block;padding:10px 18px;background:#1877F2;color:#fff;text-decoration:none;border-radius:8px">Xem chi tiết đơn hàng</a></p>
      <p style="color:#888;font-size:12px">Nếu bạn không thực hiện giao dịch này, vui lòng liên hệ hỗ trợ.</p>
    </div>`;
  sendMail({ to: toEmail, subject, html, text: `Đơn ${orderCode} đã chuyển sang: ${label}. Xem: ${url}` }).catch(() => {});
}

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
          package: { include: { product: { include: { category: true } } } },
          items: { include: { package: { include: { product: { include: { category: true } } } } } },
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
        package: { include: { product: { include: { category: true } } } },
        items: { include: { package: { include: { product: { include: { category: true } } } } } },
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

    // Mua tặng: gửi sản phẩm tới email người nhận khác.
    const isGift = req.body.is_gift === true || req.body.is_gift === 'true';
    const giftRecipientEmail = isGift ? String(req.body.gift_recipient_email || '').trim() : '';
    const giftMessage = isGift ? String(req.body.gift_message || '').trim().slice(0, 500) : '';
    if (isGift && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(giftRecipientEmail)) {
      res.status(422).json({ detail: 'Email người nhận quà không hợp lệ' });
      return;
    }

    // Validate packages
    const packageIds = items.map((i: any) => i.package_id);
    const packages = await prisma.productPackage.findMany({
      where: { id: { in: packageIds }, isActive: true },
      include: { product: true, flashSales: { where: { isActive: true, startsAt: { lte: new Date() }, endsAt: { gte: new Date() } } } },
    });

    const pkgMap = new Map<number, any>(packages.map((p: any) => [p.id, p] as [number, any]));

    // Cấp bậc của người mua -> áp giá theo hạng (nếu cấu hình).
    const buyer = await prisma.user.findUnique({ where: { id: user.user_id }, select: { rankId: true } });
    const { priceForRank } = await import('../services/ranks');

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
      // Flash sale có hiệu lực thì ưu tiên giá flash; nếu không, áp giá theo hạng.
      const baseUnit = flashSale ? money(flashSale.salePrice) : money(pkg.price);
      const unitPrice = flashSale ? baseUnit : await priceForRank(pkg.id, baseUnit, buyer?.rankId);
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
      const result = await applyCoupon(coupon_code, user.user_id.toString(), subtotal, {
        packageIds: items.map((i: any) => Number(i.package_id)),
        paymentMethod: payment_method,
        userRankId: buyer?.rankId,
      });
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
          isGift,
          giftRecipientEmail: isGift ? giftRecipientEmail : null,
          giftMessage: isGift && giftMessage ? giftMessage : null,
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
        package: { include: { product: { include: { category: true } } } },
        items: { include: { package: { include: { product: { include: { category: true } } } } } },
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

// ── Mua không cần đăng nhập (Guest checkout) ──────────
// Khách nhập email → tạo đơn (thanh toán SePay) → nhận sản phẩm qua email.
// Không hỗ trợ thanh toán bằng số dư / đổi điểm. userId = "guest:<email>".
router.post('/guest', async (req: Request, res: Response) => {
  try {
    const { items, coupon_code, notes } = req.body;
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(422).json({ detail: 'Email không hợp lệ' });
      return;
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(422).json({ detail: 'Cần ít nhất 1 sản phẩm' });
      return;
    }
    // Nếu email đã có tài khoản → yêu cầu đăng nhập (tránh chiếm dụng).
    const existed = await prisma.user.findUnique({ where: { email } });
    if (existed) {
      res.status(409).json({ detail: 'Email đã có tài khoản. Vui lòng đăng nhập để mua hàng.', need_login: true });
      return;
    }

    const guestId = `guest:${email}`;
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
      if (!pkg) { res.status(400).json({ detail: `Không tìm thấy gói ${item.package_id}` }); return; }
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

    let discountAmount = 0;
    let couponId: number | null = null;
    if (coupon_code) {
      const result = await applyCoupon(coupon_code, guestId, subtotal);
      if (result) { discountAmount = result.discount; couponId = result.couponId; }
    }

    const taxConfig = await prisma.siteConfig.findUnique({ where: { key: 'tax_rate' } });
    const taxRate = taxConfig ? parseFloat(taxConfig.value || '0') : 0;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = Math.round(taxableAmount * (taxRate / 100));
    const totalAmount = Math.round(taxableAmount + taxAmount);

    const orderCode = genOrderCode();
    const isSingleItem = orderItemsData.length === 1;

    const order = await prisma.$transaction(async (tx: any) => {
      const newOrder = await tx.order.create({
        data: {
          orderCode,
          userId: guestId,
          userEmail: email,
          packageId: isSingleItem ? orderItemsData[0].packageId : null,
          quantity: isSingleItem ? orderItemsData[0].quantity : 1,
          subtotalAmount: subtotal,
          discountAmount,
          taxAmount,
          totalAmount,
          couponCode: coupon_code || null,
          status: 'pending',
          paymentMethod: 'sepay',
          customFieldsData: isSingleItem ? orderItemsData[0].customFieldsData : null,
          notes: notes || null,
          // Tái dùng pipeline gửi email "quà tặng" để giao key cho khách qua email.
          isGift: true,
          giftRecipientEmail: email,
        },
      });
      if (orderItemsData.length > 1) {
        await tx.orderItem.createMany({ data: orderItemsData.map((it) => ({ ...it, orderId: newOrder.id })) });
      }
      if (couponId) {
        const c = await tx.giftCode.findUnique({ where: { id: couponId } });
        if (c) {
          if (c.usageLimit > 0) {
            const ok = await tx.giftCode.updateMany({
              where: { id: couponId, usageCount: { lt: c.usageLimit } },
              data: { usageCount: { increment: 1 } },
            });
            if (ok.count === 0) throw new Error('COUPON_LIMIT');
          } else {
            await tx.giftCode.update({ where: { id: couponId }, data: { usageCount: { increment: 1 } } });
          }
          await tx.giftCodeUsage.create({ data: { codeId: couponId, userId: guestId } });
        }
      }
      return newOrder;
    });

    const result = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        package: { include: { product: { include: { category: true } } } },
        items: { include: { package: { include: { product: { include: { category: true } } } } } },
      },
    });
    notifyNewOrder(order.id).catch(() => {});
    res.status(201).json(orderToDict(result!));
  } catch (e: any) {
    if (e?.message === 'COUPON_LIMIT') { res.status(400).json({ detail: 'Mã giảm giá đã hết lượt sử dụng' }); return; }
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
    await refundOrderBalance(order.orderCode); // hoàn tiền nếu đã trả bằng số dư (an toàn, idempotent)
    res.json({ message: 'Đã hủy đơn hàng' });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Kiểm tra mã giảm giá ───────────────────────────────
router.post('/check-coupon', requireUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { coupon_code, subtotal, package_ids, payment_method } = req.body;
    const buyer = await prisma.user.findUnique({ where: { id: user.user_id }, select: { rankId: true } });
    const result = await applyCoupon(coupon_code, user.user_id.toString(), subtotal || 0, {
      packageIds: Array.isArray(package_ids) ? package_ids.map(Number) : undefined,
      paymentMethod: payment_method,
      userRankId: buyer?.rankId,
    });
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
          package: { include: { product: { include: { category: true } } } },
          items: { include: { package: { include: { product: { include: { category: true } } } } } },
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
    } else if (status === 'completed') {
      // Admin chuyển thẳng sang completed: vẫn cấp license mã nguồn (idempotent).
      await issueSourceForOrder(order.id).catch(() => {});
    }

    // Thông báo cho khách + tích điểm khi giao xong (không chặn nếu lỗi)
    if (order.status !== status) {
      createNotification(order.userId, {
        type: 'order',
        title: `Đơn ${order.orderCode}: ${STATUS_LABELS[status] || status}`,
        body: notes || undefined,
        link: `/orders/${order.orderCode}`,
      }).catch(() => {});
      sendOrderStatusEmail(order.userEmail, order.orderCode, status);
      if (status === 'completed') {
        awardPointsForOrder(order.userId, money(order.totalAmount), order.orderCode).catch(() => {});
        maybeSendGiftEmail(order.id).catch(() => {});
        onOrderCompleted(order.id, order.userId).catch(() => {});
      }
      // Hoàn điểm đã đổi khi đơn bị hủy / hoàn tiền / thất bại
      if (['cancelled', 'refunded', 'failed'].includes(status)) {
        refundPointsForOrder(order.userId, order.orderCode).catch(() => {});
        await refundOrderBalance(order.orderCode); // hoàn tiền nếu đã trả bằng số dư (an toàn, idempotent)
      }
    }

    res.json({ message: 'Đã cập nhật', status: updated.status });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Admin: xóa hàng loạt ───────────────────────────────
router.post('/admin/bulk-delete', requireAdmin, async (req: Request, res: Response) => {
  try {
    const ids = (req.body.ids || []).map((i: any) => parseInt(i, 10)).filter((n: number) => Number.isInteger(n));
    if (ids.length === 0) { res.json({ deleted: 0 }); return; }
    const r = await prisma.order.deleteMany({ where: { id: { in: ids } } });
    res.json({ deleted: r.count });
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
    createNotification(order.userId, {
      type: 'order',
      title: `Đơn ${order.orderCode} đã được giao`,
      body: 'Xem thông tin đã giao trong chi tiết đơn hàng',
      link: `/orders/${order.orderCode}`,
    }).catch(() => {});
    sendOrderStatusEmail(order.userEmail, order.orderCode, 'completed');
    maybeSendGiftEmail(order.id).catch(() => {});
    onOrderCompleted(order.id, order.userId).catch(() => {});
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
    await refundOrderBalance(order.orderCode); // hoàn tiền nếu đã trả bằng số dư (an toàn, idempotent)
    res.json({ message: 'Đã hủy đơn' });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

export default router;
