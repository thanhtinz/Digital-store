import prisma from '../db';
import { sendMail } from './mail';

// Decimal | number | string | null — Prisma Decimal serializes via toString()
type Numeric = { toString(): string } | number | string | null | undefined;

export function money(val: Numeric): number {
  if (val === null || val === undefined) return 0;
  const n = parseFloat(val.toString());
  return Number.isFinite(n) ? n : 0;
}

/**
 * Side-effect khi đơn chuyển 'completed': tạo quyền sử dụng có hạn (entitlement)
 * và rà soát trao huy hiệu cho user. An toàn, không ném lỗi.
 */
export async function onOrderCompleted(orderId: number, userId: string): Promise<void> {
  try {
    const { createEntitlementsForOrder } = await import('./entitlements');
    await createEntitlementsForOrder(orderId);
  } catch { /* bỏ qua */ }
  try {
    const { evaluateUserBadges } = await import('./badges');
    await evaluateUserBadges(userId);
  } catch { /* bỏ qua */ }
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

  // Mã nguồn/theme: cấp license + lượt tải (idempotent); có thể tự chuyển
  // đơn sang 'completed' nếu mọi mục đều là mã nguồn (giao tức thì).
  try {
    const { issueSourceForOrder } = await import('./source');
    await issueSourceForOrder(orderId);
  } catch {
    /* không chặn giao hàng phần còn lại */
  }

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
        maybeSendGiftEmail(orderId).catch(() => {});
        onOrderCompleted(orderId, order.userId).catch(() => {});
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
    maybeSendGiftEmail(orderId).catch(() => {});
    onOrderCompleted(orderId, order.userId).catch(() => {});

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
 * Gửi email giao hàng cho người được tặng (đơn "Mua tặng").
 *
 * Chỉ gửi khi đơn đã hoàn tất giao (status='completed') và chưa gửi lần nào.
 * Idempotent: dùng updateMany có điều kiện trên `giftSentAt` làm khóa, nếu gửi
 * thất bại sẽ trả `giftSentAt` về null để lần giao sau thử lại. Không ném lỗi.
 */
export async function maybeSendGiftEmail(orderId: number): Promise<void> {
  try {
    // Khóa quyền gửi: chỉ một luồng "giành" được (giftSentAt: null -> now)
    const claim = await prisma.order.updateMany({
      where: { id: orderId, isGift: true, status: 'completed', giftSentAt: null, giftRecipientEmail: { not: null } },
      data: { giftSentAt: new Date() },
    });
    if (claim.count === 0) return; // không đủ điều kiện hoặc đã gửi

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { package: { include: { product: true } }, items: { include: { package: { include: { product: true } } } } },
    });
    if (!order || !order.giftRecipientEmail) return;

    // Gom nội dung đã giao theo từng sản phẩm
    const blocks: { name: string; data: string }[] = [];
    if (order.items.length > 0) {
      for (const it of order.items) {
        if (it.deliveryData) {
          const label = `${it.productNameSnapshot || it.package?.product?.name || ''}${it.packageNameSnapshot ? ` - ${it.packageNameSnapshot}` : ''}`;
          blocks.push({ name: label.trim() || 'Sản phẩm', data: it.deliveryData });
        }
      }
    } else if (order.deliveryData) {
      const label = `${order.package?.product?.name || ''}${order.package?.name ? ` - ${order.package.name}` : ''}`;
      blocks.push({ name: label.trim() || 'Sản phẩm', data: order.deliveryData });
    }

    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const itemsHtml = blocks.length
      ? blocks
          .map(
            (b) => `
        <div style="margin:0 0 12px;padding:12px 14px;background:#f6f8fb;border-radius:10px">
          <div style="font-weight:600;margin-bottom:6px">${esc(b.name)}</div>
          <pre style="margin:0;white-space:pre-wrap;word-break:break-word;font-family:Consolas,monospace;font-size:13px;color:#222">${esc(b.data.replace(/\n---\n/g, '\n──────────\n'))}</pre>
        </div>`
          )
          .join('')
      : '<p>Người tặng sẽ gửi nội dung sản phẩm cho bạn trong thời gian sớm nhất.</p>';

    const messageHtml = order.giftMessage
      ? `<div style="margin:0 0 16px;padding:12px 14px;background:#fff6e5;border-left:4px solid #ffab00;border-radius:6px">
           <div style="font-size:12px;color:#b76e00;margin-bottom:4px">Lời nhắn từ người tặng</div>
           <div style="color:#333">${esc(order.giftMessage)}</div>
         </div>`
      : '';

    const subject = `🎁 Bạn nhận được một món quà — đơn ${order.orderCode}`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#212B36">
        <h2 style="margin:0 0 6px">🎁 Bạn vừa được tặng một sản phẩm!</h2>
        <p style="color:#637381;margin:0 0 16px">Một người bạn đã mua tặng bạn sản phẩm số dưới đây. Chúc bạn sử dụng vui vẻ!</p>
        ${messageHtml}
        <h3 style="margin:16px 0 8px">Nội dung sản phẩm</h3>
        ${itemsHtml}
        <p style="color:#919EAB;font-size:12px;margin-top:18px">Mã đơn: ${order.orderCode}. Email này được gửi tự động, vui lòng không trả lời.</p>
      </div>`;
    const text = `Bạn được tặng một sản phẩm (đơn ${order.orderCode}).${order.giftMessage ? `\nLời nhắn: ${order.giftMessage}` : ''}\n\n${blocks.map((b) => `${b.name}:\n${b.data}`).join('\n\n')}`;

    const result = await sendMail({ to: order.giftRecipientEmail, subject, html, text });
    if (!result.ok) {
      // Gửi hỏng -> mở khóa để thử lại lần giao sau
      await prisma.order.updateMany({ where: { id: orderId, giftSentAt: { not: null } }, data: { giftSentAt: null } });
    }
  } catch {
    // nuốt: gửi quà không được làm hỏng luồng giao hàng
    await prisma.order.updateMany({ where: { id: orderId, isGift: true, status: 'completed' }, data: { giftSentAt: null } }).catch(() => {});
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
 * Hoàn TIỀN vào số dư khi hủy/hoàn một đơn đã thanh toán bằng số dư.
 * Chỉ áp dụng paymentMethod='balance'. Idempotent (chống hoàn 2 lần). Không ném lỗi.
 */
export async function refundOrderBalance(orderCode: string): Promise<void> {
  try {
    if (!orderCode) return;
    const order = await prisma.order.findUnique({ where: { orderCode } });
    if (!order || order.paymentMethod !== 'balance') return;
    const uid = parseInt(String(order.userId), 10);
    if (!uid || Number.isNaN(uid)) return;
    const amount = money(order.totalAmount);
    if (amount <= 0) return;
    const existed = await prisma.balanceTransaction.findFirst({ where: { reference: order.orderCode, type: 'refund' } });
    if (existed) return; // đã hoàn -> bỏ qua
    await prisma.$transaction(async (tx: any) => {
      const u = await tx.user.update({ where: { id: uid }, data: { balance: { increment: amount } } });
      await tx.balanceTransaction.create({
        data: { userId: uid, amount, balanceAfter: money(u.balance), type: 'refund', status: 'completed', reference: order.orderCode, description: `Hoàn tiền hủy đơn ${order.orderCode}` },
      });
    });
    const { createNotification } = await import('./notify');
    createNotification(uid, { type: 'payment', title: `Hoàn ${amount.toLocaleString()}đ vào số dư`, body: `Đơn ${order.orderCode} đã hủy`, link: '/profile' }).catch(() => {});
  } catch {
    /* nuốt: hoàn tiền không được làm hỏng luồng hủy */
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
    productType: item.package?.product?.category?.productType || 'premium',
    quantity: item.quantity,
    unitPrice: money(item.unitPrice),
    lineTotal: money(item.lineTotal),
    status: item.status,
    deliveryData: item.deliveryData,
  }));

  // Loại sản phẩm của đơn (để lọc ở admin): ưu tiên item, fallback gói đơn lẻ.
  const productType =
    items.find((i: any) => i.productType && i.productType !== 'premium')?.productType ||
    order.package?.product?.category?.productType ||
    items[0]?.productType ||
    'premium';

  return {
    id: order.id,
    orderCode: order.orderCode,
    userId: order.userId,
    userEmail: order.userEmail,
    packageId: order.packageId,
    packageName: order.package?.name,
    productName: order.package?.product?.name,
    productImg: order.package?.product?.imageUrl,
    productType,
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
    isGift: order.isGift || false,
    giftRecipientEmail: order.giftRecipientEmail || null,
    giftMessage: order.giftMessage || null,
    giftSentAt: order.giftSentAt?.toISOString() || null,
    createdAt: order.createdAt?.toISOString(),
    updatedAt: order.updatedAt?.toISOString(),
    items,
  };
}
