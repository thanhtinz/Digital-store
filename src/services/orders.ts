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
 * Tự động giao hàng khi đơn hàng được thanh toán
 */
export async function autoDeliver(orderId: number): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      package: { include: { stockItems: { where: { isSold: false }, take: 10 } } },
      items: {
        include: {
          package: { include: { stockItems: { where: { isSold: false }, take: 10 } } },
        },
      },
    },
  });

  if (!order || order.status !== 'paid') return;

  // Multi-item order
  if (order.items.length > 0) {
    for (const item of order.items) {
      if (!item.package || item.package.deliveryType !== 'auto') continue;
      await deliverAutoItem(item.id, item.package, item.quantity);
    }
    // Check if all items delivered
    const allDelivered = await prisma.orderItem.findFirst({
      where: { orderId, status: { not: 'completed' } },
    });
    if (!allDelivered) {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'completed' },
      });
      const { awardPointsForOrder } = await import('./loyalty');
      awardPointsForOrder(order.userId, money(order.totalAmount), order.orderCode).catch(() => {});
    }
    return;
  }

  // Single package order
  if (order.package?.deliveryType === 'auto') {
    const stockItems = order.package.stockItems || [];
    const needed = order.quantity || 1;
    if (stockItems.length < needed) return;

    const toDeliver = stockItems.slice(0, needed);
    const deliveryData = toDeliver.map((s: { id: number; data: string }) => s.data).join('\n---\n');

    await prisma.$transaction([
      ...toDeliver.map((s: { id: number; data: string }) =>
        prisma.stockItem.update({
          where: { id: s.id },
          data: { isSold: true, soldAt: new Date(), orderId },
        })
      ),
      prisma.order.update({
        where: { id: orderId },
        data: { status: 'completed', deliveryData },
      }),
    ]);

    const { awardPointsForOrder } = await import('./loyalty');
    awardPointsForOrder(order.userId, money(order.totalAmount), order.orderCode).catch(() => {});

    // Cảnh báo hết hàng nếu tồn kho thấp (≤5)
    const remaining = await prisma.stockItem.count({ where: { packageId: order.package.id, isSold: false } });
    if (remaining <= 5) {
      const pkg = await prisma.productPackage.findUnique({ where: { id: order.package.id }, include: { product: true } });
      const { notifyLowStock } = await import('./telegram');
      notifyLowStock(pkg?.product?.name || '', pkg?.name || '', remaining).catch(() => {});
    }
  }
}

async function deliverAutoItem(
  itemId: number,
  pkg: { deliveryType: string; stockItems: Array<{ id: number; data: string }> },
  quantity: number
): Promise<void> {
  const stockItems = pkg.stockItems || [];
  if (stockItems.length < quantity) return;

  const toDeliver = stockItems.slice(0, quantity);
  const deliveryData = toDeliver.map((s: { id: number; data: string }) => s.data).join('\n---\n');

  await prisma.$transaction([
    ...toDeliver.map((s: { id: number; data: string }) =>
      prisma.stockItem.update({
        where: { id: s.id },
        data: { isSold: true, soldAt: new Date() },
      })
    ),
    prisma.orderItem.update({
      where: { id: itemId },
      data: { status: 'completed', deliveryData },
    }),
  ]);
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
