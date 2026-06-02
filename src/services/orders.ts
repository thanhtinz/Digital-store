import prisma from '../db';

// Decimal | number | string | null — Prisma Decimal serializes via toString()
type Numeric = { toString(): string } | number | string | null | undefined;

export function money(val: Numeric): number {
  if (val === null || val === undefined) return 0;
  const n = parseFloat(val.toString());
  return Number.isFinite(n) ? n : 0;
}

export function genOrderCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 10; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Giành (claim) đúng `needed` item kho chưa bán của một gói — trong một transaction.
 *
 * Chống bán trùng giữa các đơn: chọn ứng viên rồi `updateMany` với điều kiện
 * `isSold:false` và đếm số dòng thực sự cập nhật. Nếu bị luồng khác giành mất
 * (count < needed) thì ném STOCK_RACE để rollback & retry ở ngoài. Trả về mảng
 * `data` của các item đã giành, hoặc `null` nếu không đủ kho.
 */
async function claimStockTx(tx: any, packageId: number, needed: number, orderId: number | null): Promise<string[] | null> {
  if (needed <= 0) return [];
  const candidates = await tx.stockItem.findMany({
    where: { packageId, isSold: false },
    orderBy: { id: 'asc' },
    take: needed,
    select: { id: true, data: true },
  });
  if (candidates.length < needed) return null; // không đủ kho
  const ids = candidates.map((s: { id: number }) => s.id);
  const claimed = await tx.stockItem.updateMany({
    where: { id: { in: ids }, isSold: false },
    data: { isSold: true, soldAt: new Date(), orderId: orderId ?? undefined },
  });
  if (claimed.count < needed) throw new Error('STOCK_RACE'); // bị giành mất -> rollback & retry
  return candidates.map((s: { data: string }) => s.data);
}

/**
 * Tự động giao hàng khi đơn hàng được thanh toán.
 *
 * An toàn đồng thời: việc "chốt" đơn/dòng-đơn (conditional update) đóng vai trò
 * khóa hàng (row lock), bao trùm cả bước claim kho — nên hai lần gọi đồng thời
 * cho cùng một đơn không thể tiêu hao kho gấp đôi.
 */
export async function autoDeliver(orderId: number): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      package: true,
      items: { include: { package: true } },
    },
  });

  if (!order || order.status !== 'paid') return;

  // Multi-item order
  if (order.items.length > 0) {
    for (const item of order.items) {
      if (!item.package || item.package.deliveryType !== 'auto' || !item.packageId) continue;
      const packageId = item.packageId;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await prisma.$transaction(async (tx: any) => {
            // Khóa dòng-đơn: chỉ một luồng chuyển được 'completed'
            const lock = await tx.orderItem.updateMany({
              where: { id: item.id, status: { not: 'completed' } },
              data: { status: 'completed' },
            });
            if (lock.count === 0) return; // đã giao bởi luồng khác
            const data = await claimStockTx(tx, packageId, item.quantity, orderId);
            if (!data) throw new Error('NO_STOCK'); // hết kho -> rollback, dòng-đơn trở lại chưa giao
            await tx.orderItem.update({ where: { id: item.id }, data: { deliveryData: data.join('\n---\n') } });
          });
          break; // xong (đã giao hoặc luồng khác giao)
        } catch (e: any) {
          if (e?.message === 'STOCK_RACE') continue; // thử lại
          if (e?.message === 'NO_STOCK') break;       // không đủ kho -> để xử lý thủ công
          throw e;
        }
      }
    }
    // Check if all items delivered
    const allDelivered = await prisma.orderItem.findFirst({
      where: { orderId, status: { not: 'completed' } },
    });
    if (!allDelivered) {
      const done = await prisma.order.updateMany({
        where: { id: orderId, status: 'paid' },
        data: { status: 'completed' },
      });
      if (done.count > 0) {
        const { awardPointsForOrder } = await import('./loyalty');
        awardPointsForOrder(order.userId, money(order.totalAmount), order.orderCode).catch(() => {});
      }
    }
    return;
  }

  // Single package order
  if (order.package?.deliveryType === 'auto') {
    const packageId = order.package.id;
    const needed = order.quantity || 1;
    let delivered = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const outcome = await prisma.$transaction(async (tx: any) => {
          // Khóa đơn: chỉ một luồng chuyển 'paid' -> 'completed'
          const lock = await tx.order.updateMany({
            where: { id: orderId, status: 'paid' },
            data: { status: 'completed' },
          });
          if (lock.count === 0) return 'taken'; // đã/đang xử lý bởi luồng khác
          const data = await claimStockTx(tx, packageId, needed, orderId);
          if (!data) throw new Error('NO_STOCK'); // rollback -> đơn trở lại 'paid'
          await tx.order.update({ where: { id: orderId }, data: { deliveryData: data.join('\n---\n') } });
          return 'done';
        });
        if (outcome === 'taken') return;       // không phải ta giao -> không tích điểm
        if (outcome === 'done') { delivered = true; break; }
      } catch (e: any) {
        if (e?.message === 'STOCK_RACE') continue; // thử lại
        if (e?.message === 'NO_STOCK') return;       // không đủ kho -> giữ 'paid', xử lý thủ công
        throw e;
      }
    }
    if (!delivered) return;

    const { awardPointsForOrder } = await import('./loyalty');
    awardPointsForOrder(order.userId, money(order.totalAmount), order.orderCode).catch(() => {});

    // Cảnh báo hết hàng nếu tồn kho thấp (≤5)
    const remaining = await prisma.stockItem.count({ where: { packageId, isSold: false } });
    if (remaining <= 5) {
      const pkg = await prisma.productPackage.findUnique({ where: { id: packageId }, include: { product: true } });
      const { notifyLowStock } = await import('./telegram');
      notifyLowStock(pkg?.product?.name || '', pkg?.name || '', remaining).catch(() => {});
    }
  }
}

/**
 * Hoàn tiền vào balance user
 */
export async function refundToBalance(
  orderId: number,
  userId: number,
  amount: number,
  reason: string
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const newBalance = money(user.balance) + amount;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { balance: newBalance },
    }),
    prisma.balanceTransaction.create({
      data: {
        userId,
        amount,
        balanceAfter: newBalance,
        type: 'refund',
        status: 'completed',
        reference: `ORD-${orderId}`,
        description: reason,
      },
    }),
    prisma.order.update({
      where: { id: orderId },
      data: { status: 'cancelled', notes: reason },
    }),
  ]);

  // Hoàn lại điểm đã đổi cho đơn này (nếu có)
  const ord = await prisma.order.findUnique({ where: { id: orderId }, select: { orderCode: true } });
  if (ord?.orderCode) {
    const { refundPointsForOrder } = await import('./loyalty');
    refundPointsForOrder(userId, ord.orderCode).catch(() => {});
  }
}

/**
 * Áp dụng mã giảm giá
 */
export async function applyCoupon(
  code: string,
  userId: string,
  subtotal: number
): Promise<{ discount: number; couponId: number } | null> {
  const now = new Date();
  const coupon = await prisma.giftCode.findUnique({ where: { code } });
  if (!coupon || !coupon.isActive) return null;
  if (coupon.startsAt && coupon.startsAt > now) return null;
  if (coupon.expiresAt && coupon.expiresAt < now) return null;
  if (coupon.usageLimit > 0 && coupon.usageCount >= coupon.usageLimit) return null;
  if (money(coupon.minOrder) > subtotal) return null;

  if (coupon.perUserLimit > 0) {
    const used = await prisma.giftCodeUsage.count({
      where: { codeId: coupon.id, userId },
    });
    if (used >= coupon.perUserLimit) return null;
  }

  let discount = 0;
  if (coupon.discountType === 'percent') {
    discount = (subtotal * money(coupon.discountValue)) / 100;
    if (coupon.maxDiscount) discount = Math.min(discount, money(coupon.maxDiscount));
  } else {
    discount = money(coupon.discountValue);
  }

  return { discount: Math.min(discount, subtotal), couponId: coupon.id };
}

/**
 * Serialize order to dict
 */
export function orderToDict(order: any): Record<string, any> {
  const items = (order.items || []).map((item: any) => ({
    id: item.id,
    packageId: item.packageId,
    productName: item.productNameSnapshot || item.package?.product?.name,
    packageName: item.packageNameSnapshot || item.package?.name,
    quantity: item.quantity,
    unitPrice: money(item.unitPrice),
    lineTotal: money(item.lineTotal),
    status: item.status,
    deliveryData: item.deliveryData,
  }));

  return {
    id: order.id,
    orderCode: order.orderCode,
    userId: order.userId,
    userEmail: order.userEmail,
    packageId: order.packageId,
    packageName: order.package?.name,
    productName: order.package?.product?.name,
    productImg: order.package?.product?.imageUrl,
    quantity: order.quantity,
    subtotalAmount: money(order.subtotalAmount),
    discountAmount: money(order.discountAmount),
    taxAmount: money(order.taxAmount),
    totalAmount: money(order.totalAmount),
    couponCode: order.couponCode,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentLinkId: order.paymentLinkId,
    deliveryData: order.deliveryData,
    notes: order.notes,
    createdAt: order.createdAt?.toISOString(),
    updatedAt: order.updatedAt?.toISOString(),
    items,
  };
}
