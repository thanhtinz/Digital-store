import prisma from './db';
import { getActiveFlashPrices, effectivePrice } from './catalog';
import { checkCoupon } from './coupons';
import { generateOrderCode, parseCustomFields } from './utils';
import { getSetting, getSettings } from './settings';
import { creditWallet } from './wallet';
import { sendMail, emailLayout } from './mail';
import { sendTelegram, escapeHtml } from './telegram';
import { notifyUser } from './notify';

export type CheckoutItemInput = {
  packageId: number;
  quantity: number;
  customFieldsData?: Record<string, string>;
};

export class OrderError extends Error {}

// Builds and persists a PENDING order from cart-style items, validating
// prices server-side (flash sales included) and required custom fields.
export async function createOrder(params: {
  userId: number;
  email: string;
  items: CheckoutItemInput[];
  couponCode?: string;
  redeemPoints?: number;
  paymentMethod: 'stripe' | 'paypal' | 'balance';
}) {
  const { userId, email, items, couponCode, redeemPoints, paymentMethod } = params;
  if (!items.length) throw new OrderError('Your cart is empty');
  if (items.length > 50) throw new OrderError('Too many items in one order');

  const packageIds = items.map((i) => i.packageId);
  const packages = await prisma.package.findMany({
    where: { id: { in: packageIds }, isActive: true, product: { isActive: true } },
    include: { product: { include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } } } },
  });
  const flash = await getActiveFlashPrices(packageIds);

  // Auto-delivered packages are sold strictly from stock — validate upfront
  // so a sold-out package can never be paid for.
  const autoIds = packages.filter((p) => p.autoDeliver).map((p) => p.id);
  const stockGroups = autoIds.length
    ? await prisma.stockItem.groupBy({ by: ['packageId'], where: { packageId: { in: autoIds }, isSold: false }, _count: true })
    : [];
  for (const item of items) {
    const pkg = packages.find((p) => p.id === item.packageId);
    if (pkg && !pkg.autoDeliver && !pkg.inStock) {
      throw new OrderError(`${pkg.product.name} — ${pkg.name} is out of stock`);
    }
    if (!pkg?.autoDeliver) continue;
    const stock = stockGroups.find((g) => g.packageId === pkg.id)?._count ?? 0;
    const quantity = Math.min(Math.max(1, Math.floor(item.quantity || 1)), 100);
    if (quantity > stock) {
      throw new OrderError(
        stock === 0
          ? `${pkg.product.name} — ${pkg.name} is out of stock`
          : `Only ${stock} of ${pkg.product.name} — ${pkg.name} left in stock`
      );
    }
  }

  let subtotal = 0;
  const orderItems = items.map((item) => {
    const pkg = packages.find((p) => p.id === item.packageId);
    if (!pkg) throw new OrderError('One of the items is no longer available');
    const quantity = Math.min(Math.max(1, Math.floor(item.quantity || 1)), 100);

    // Validate required custom fields against the package definition.
    const defs = parseCustomFields(pkg.customFields);
    const data: Record<string, string> = {};
    for (const def of defs) {
      const value = String(item.customFieldsData?.[def.key] ?? '').trim().slice(0, 500);
      if (def.required && !value) throw new OrderError(`"${def.label}" is required for ${pkg.product.name} — ${pkg.name}`);
      if (value) data[def.key] = value;
    }

    const { price } = effectivePrice(pkg, flash);
    const lineTotal = Math.round(price * quantity * 100) / 100;
    subtotal += lineTotal;
    return {
      packageId: pkg.id,
      productName: pkg.product.name,
      packageName: pkg.name,
      imageUrl: pkg.product.images[0]?.url || null,
      quantity,
      unitPrice: price,
      lineTotal,
      customFieldsData: Object.keys(data).length ? data : undefined,
      flashSaleItemId: flash.get(pkg.id) && effectivePrice(pkg, flash).onSale ? flash.get(pkg.id)!.flashSaleItemId : null,
    };
  });
  subtotal = Math.round(subtotal * 100) / 100;

  let discount = 0;
  let couponId: number | null = null;
  let appliedCoupon: string | null = null;
  if (couponCode) {
    const check = await checkCoupon(couponCode, userId, subtotal);
    if (!check.ok) throw new OrderError(check.reason);
    discount = check.discount;
    couponId = check.couponId;
    appliedCoupon = check.code;
  }
  // Loyalty redemption — points become an extra discount, capped so the
  // remaining total never drops below the payment minimum.
  let pointsUsed = 0;
  let pointsDiscount = 0;
  if (redeemPoints && redeemPoints > 0) {
    const ls = await getSettings(['loyalty_enabled', 'loyalty_redeem_value', 'loyalty_min_redeem']);
    if (ls.loyalty_enabled !== 'true') throw new OrderError('Loyalty points are not enabled');
    const redeemValue = Number(ls.loyalty_redeem_value) || 0;
    const minRedeem = Number(ls.loyalty_min_redeem) || 0;
    const buyer = await prisma.user.findUnique({ where: { id: userId } });
    const have = buyer?.loyaltyPoints || 0;
    if (redeemValue <= 0 || have < minRedeem) throw new OrderError(`You need at least ${minRedeem} points to redeem`);
    const wanted = Math.min(Math.floor(redeemPoints), have);
    const maxDiscount = Math.max(0, subtotal - discount - 0.5);
    pointsDiscount = Math.min(Math.round(wanted * redeemValue * 100) / 100, Math.round(maxDiscount * 100) / 100);
    pointsUsed = Math.ceil(pointsDiscount / redeemValue);
    if (pointsUsed <= 0) { pointsUsed = 0; pointsDiscount = 0; }
  }

  const total = Math.round((subtotal - discount - pointsDiscount) * 100) / 100;
  if (total < 0.5) throw new OrderError('Order total is below the payment minimum ($0.50)');

  const currency = (await getSetting('currency')) || 'USD';

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        code: generateOrderCode(),
        userId,
        email,
        subtotal,
        discount: Math.round((discount + pointsDiscount) * 100) / 100,
        total,
        currency,
        couponCode: appliedCoupon,
        pointsUsed,
        paymentMethod,
        items: {
          create: orderItems,
        },
      },
      include: { items: true },
    });
    if (couponId) {
      await tx.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } });
      await tx.couponRedemption.create({ data: { couponId, userId, orderId: created.id } });
    }
    if (pointsUsed > 0) {
      const res = await tx.user.updateMany({
        where: { id: userId, loyaltyPoints: { gte: pointsUsed } },
        data: { loyaltyPoints: { decrement: pointsUsed } },
      });
      if (res.count !== 1) throw new OrderError('Not enough loyalty points');
    }
    // Reserve flash-sale allocation.
    for (const it of orderItems) {
      if (it.flashSaleItemId) {
        await tx.flashSaleItem.update({
          where: { id: it.flashSaleItemId },
          data: { soldCount: { increment: it.quantity } },
        });
      }
    }
    return created;
  });

  return order;
}

// Returns everything a cancelled order was holding: coupon usage,
// flash-sale allocation and redeemed loyalty points. Safe to call once per
// order — callers must only invoke it when transitioning PENDING → CANCELLED.
export async function releaseOrderResources(orderId: number): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return;

  // Coupon: free the redemption slot and the per-user usage record.
  if (order.couponCode) {
    const coupon = await prisma.coupon.findUnique({ where: { code: order.couponCode } });
    if (coupon) {
      await prisma.coupon.updateMany({
        where: { id: coupon.id, usedCount: { gt: 0 } },
        data: { usedCount: { decrement: 1 } },
      }).catch(() => {});
      await prisma.couponRedemption.deleteMany({ where: { couponId: coupon.id, orderId } }).catch(() => {});
    }
  }

  // Flash sale: return the reserved allocation.
  for (const item of order.items) {
    if (item.flashSaleItemId) {
      await prisma.flashSaleItem.updateMany({
        where: { id: item.flashSaleItemId, soldCount: { gte: item.quantity } },
        data: { soldCount: { decrement: item.quantity } },
      }).catch(() => {});
    }
  }

  // Wallet safety net: a balance order that was debited but never marked
  // paid (crash between the two steps) gets its money back on release.
  if (order.paymentMethod === 'balance') {
    const debit = await prisma.walletTransaction.findFirst({
      where: { userId: order.userId, type: 'PURCHASE', note: `Order ${order.code}` },
    });
    const refunded = debit
      ? await prisma.walletTransaction.findFirst({
          where: { userId: order.userId, type: 'REFUND', note: `Refund — order ${order.code}` },
        })
      : null;
    if (debit && !refunded) {
      const { creditWallet } = await import('./wallet');
      await creditWallet(order.userId, Number(order.total), 'REFUND', `Refund — order ${order.code}`).catch(() => {});
    }
  }

  // Loyalty: give redeemed points back.
  if (order.pointsUsed > 0) {
    await prisma.user.update({
      where: { id: order.userId },
      data: { loyaltyPoints: { increment: order.pointsUsed } },
    }).catch(() => {});
  }
}

// Abandoned checkouts: cancel PENDING orders older than 24h so their
// coupon slots, flash-sale stock and loyalty points free up again.
export async function expireStaleOrders(): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const stale = await prisma.order.findMany({
    where: { status: 'PENDING', createdAt: { lt: cutoff } },
    select: { id: true },
    take: 200,
  });
  let expired = 0;
  for (const { id } of stale) {
    const res = await prisma.order.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'CANCELLED' } });
    if (res.count === 1) {
      await releaseOrderResources(id);
      expired += 1;
    }
  }
  return expired;
}

// Marks an order paid (idempotent) and runs auto-delivery from stock pools.
export async function markOrderPaid(orderId: number, paymentRef?: string): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order || order.status !== 'PENDING') return;

  // Atomic transition — loses the race cleanly if the order was cancelled
  // or expired between the read above and this write.
  const flipped = await prisma.order.updateMany({
    where: { id: orderId, status: 'PENDING' },
    data: { status: 'PAID', paidAt: new Date(), ...(paymentRef ? { paymentRef } : {}) },
  });
  if (flipped.count !== 1) return;

  // Update sold counters on products.
  const pkgIds = order.items.map((i) => i.packageId).filter((v): v is number => v != null);
  const pkgs = await prisma.package.findMany({ where: { id: { in: pkgIds } }, select: { id: true, productId: true } });
  for (const item of order.items) {
    const pkg = pkgs.find((p) => p.id === item.packageId);
    if (pkg) {
      await prisma.product.update({ where: { id: pkg.productId }, data: { soldCount: { increment: item.quantity } } }).catch(() => {});
    }
  }

  await autoDeliver(orderId);
  await sendOrderEmail(orderId).catch(() => {});
  await grantRewards(orderId).catch(() => {});

  // Ping the store owner on Telegram (no-op unless configured).
  const itemsLabel = order.items.map((i) => `${i.productName} — ${i.packageName} ×${i.quantity}`).join(', ');
  sendTelegram(
    `<b>New paid order</b> ${order.code}\n` +
    `${escapeHtml(itemsLabel)}\n` +
    `Total: $${Number(order.total).toFixed(2)} · ${order.paymentMethod || 'unknown'} · ${escapeHtml(order.email)}`
  ).catch(() => {});
}

// Loyalty points for the buyer + affiliate commission for their referrer.
async function grantRewards(orderId: number): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;
  const s = await getSettings(['loyalty_enabled', 'loyalty_earn_rate', 'affiliate_enabled', 'affiliate_rate']);

  if (s.loyalty_enabled === 'true') {
    const earned = Math.floor(Number(order.total) * (Number(s.loyalty_earn_rate) || 0));
    if (earned > 0) {
      await prisma.user.update({ where: { id: order.userId }, data: { loyaltyPoints: { increment: earned } } });
    }
  }

  if (s.affiliate_enabled === 'true') {
    const buyer = await prisma.user.findUnique({ where: { id: order.userId } });
    if (buyer?.referredById && buyer.referredById !== buyer.id) {
      // Per-item commission: each product may override the global rate.
      // Item amounts are scaled by total/subtotal so coupons and points
      // reduce commissions proportionally.
      const items = await prisma.orderItem.findMany({
        where: { orderId },
        include: { package: { select: { product: { select: { affiliateRate: true } } } } },
      });
      const defaultRate = Number(s.affiliate_rate) || 0;
      const subtotal = Number(order.subtotal) || 0;
      const scale = subtotal > 0 ? Number(order.total) / subtotal : 0;
      let commission = 0;
      for (const item of items) {
        const override = item.package?.product.affiliateRate;
        const rate = override !== null && override !== undefined ? Number(override) : defaultRate;
        commission += Number(item.lineTotal) * scale * (rate / 100);
      }
      commission = Math.round(commission * 100) / 100;
      if (commission > 0) {
        await creditWallet(buyer.referredById, commission, 'COMMISSION', `Referral commission — order ${order.code}`);
      }
    }
  }
}

// Delivers items whose package has auto-delivery enabled, pulling unsold
// stock items. Marks the order COMPLETED when every item is delivered.
// Professional touches: a per-package delivery note is appended to the
// codes, the store owner is alerted when stock runs low, and orders that
// could not be fully auto-delivered raise a manual-fulfillment alert.
export async function autoDeliver(orderId: number): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order || (order.status !== 'PAID' && order.status !== 'COMPLETED')) return;

  const shortages: string[] = [];

  for (const item of order.items) {
    if (item.deliveredAt || !item.packageId) continue;
    const pkg = await prisma.package.findUnique({ where: { id: item.packageId }, include: { product: { select: { name: true } } } });
    if (!pkg?.autoDeliver) continue;

    const delivered: string[] = [];
    for (let i = 0; i < item.quantity; i += 1) {
      // Claim one unsold stock item atomically.
      const claimed = await prisma.$transaction(async (tx) => {
        const stock = await tx.stockItem.findFirst({ where: { packageId: pkg.id, isSold: false }, orderBy: { id: 'asc' } });
        if (!stock) return null;
        const updated = await tx.stockItem.updateMany({
          where: { id: stock.id, isSold: false },
          data: { isSold: true, orderItemId: item.id, soldAt: new Date() },
        });
        return updated.count === 1 ? stock : null;
      });
      if (!claimed) break;
      delivered.push(claimed.content);
    }

    const withNote = (codes: string[]) =>
      codes.join('\n') + (pkg.deliveryNote ? `\n\n${pkg.deliveryNote}` : '');

    if (delivered.length === item.quantity) {
      await prisma.orderItem.update({
        where: { id: item.id },
        data: { deliveryData: withNote(delivered), deliveredAt: new Date() },
      });
    } else if (delivered.length > 0) {
      // Partial stock — deliver what we have, admin completes the rest.
      await prisma.orderItem.update({
        where: { id: item.id },
        data: { deliveryData: withNote(delivered) },
      });
      shortages.push(`${pkg.product.name} — ${pkg.name} (${delivered.length}/${item.quantity} delivered)`);
    } else {
      shortages.push(`${pkg.product.name} — ${pkg.name} (0/${item.quantity} delivered)`);
    }

    // Low-stock alert for the store owner (fires when crossing the threshold).
    if (pkg.lowStockAlert != null && delivered.length > 0) {
      const left = await prisma.stockItem.count({ where: { packageId: pkg.id, isSold: false } });
      if (left <= pkg.lowStockAlert && left + delivered.length > pkg.lowStockAlert) {
        sendTelegram(`<b>Low stock</b> — ${escapeHtml(`${pkg.product.name} — ${pkg.name}`)}: ${left} unit(s) left (threshold ${pkg.lowStockAlert})`).catch(() => {});
        notifyAdmin(
          `Low stock: ${pkg.product.name} — ${pkg.name}`,
          `<p><b>${pkg.product.name} — ${pkg.name}</b> is down to <b>${left}</b> unsold unit${left === 1 ? '' : 's'} (alert threshold: ${pkg.lowStockAlert}).</p>
           <p>Top up the stock pool in Admin → Auto delivery to keep instant delivery running.</p>`
        ).catch(() => {});
      }
    }
  }

  // Alert the owner when an order is stuck waiting for manual fulfillment.
  if (shortages.length > 0) {
    sendTelegram(`<b>Manual fulfillment needed</b> — order ${order.code}\n${escapeHtml(shortages.join('; '))}`).catch(() => {});
    notifyAdmin(
      `Order ${order.code} needs manual delivery`,
      `<p>Auto-delivery ran out of stock for order <b>${order.code}</b>:</p>
       <ul>${shortages.map((s) => `<li>${s}</li>`).join('')}</ul>
       <p>Fulfill it from Admin → Deliveries.</p>`
    ).catch(() => {});
  }

  const remaining = await prisma.orderItem.count({ where: { orderId, deliveredAt: null } });
  if (remaining === 0) {
    await prisma.order.update({ where: { id: orderId }, data: { status: 'COMPLETED' } });
  }

  const deliveredAny = await prisma.orderItem.count({ where: { orderId, deliveryData: { not: null } } });
  if (deliveredAny > 0) await sendDeliveryEmail(orderId).catch(() => {});
}

// Operational alerts for the store owner (sent to the support email).
async function notifyAdmin(subject: string, bodyHtml: string): Promise<void> {
  const [siteName, adminEmail] = await Promise.all([getSetting('site_name'), getSetting('support_email')]);
  if (!adminEmail) return;
  await sendMail(adminEmail, `[${siteName}] ${subject}`, emailLayout(siteName, subject, bodyHtml));
}

// Emails the buyer their delivered items (called after auto-delivery and
// after each manual delivery from the admin panel).
export async function sendDeliveryEmail(orderId: number): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return;
  const delivered = order.items.filter((i) => i.deliveryData);
  if (!delivered.length) return;
  const siteName = await getSetting('site_name');
  const appUrl = (await getSetting('app_url')) || '';
  const blocks = delivered
    .map((i) => `<p style="margin:16px 0 4px"><b>${i.productName} — ${i.packageName}</b></p>
      <pre style="background:#111827;color:#d1fae5;padding:12px;border-radius:8px;font-size:12px;white-space:pre-wrap;word-break:break-all">${i.deliveryData}</pre>`)
    .join('');
  const allDone = order.items.every((i) => i.deliveredAt);
  const html = emailLayout(
    siteName,
    allDone ? `Your order ${order.code} has been delivered` : `Items delivered for order ${order.code}`,
    `<p>Good news — your item${delivered.length > 1 ? 's are' : ' is'} ready:</p>
     ${blocks}
     <p>You can always find your items on the order page:<br>
     <a href="${appUrl}/orders/${order.code}">${appUrl}/orders/${order.code}</a></p>`
  );
  const textBlocks = delivered
    .map((i) => `<b>${escapeHtml(`${i.productName} — ${i.packageName}`)}</b>\n<code>${escapeHtml(i.deliveryData || '')}</code>`)
    .join('\n');
  await notifyUser(order.userId, {
    subject: `Your ${siteName} order ${order.code} is ready`,
    html,
    text: `<b>Order ${order.code} — item${delivered.length > 1 ? 's' : ''} delivered</b>\n${textBlocks}\n\n${appUrl}/orders/${order.code}`,
  });
}

async function sendOrderEmail(orderId: number): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return;
  const siteName = await getSetting('site_name');
  const appUrl = (await getSetting('app_url')) || '';
  const rows = order.items
    .map((i) => `<tr><td style="padding:6px 0">${i.productName} — ${i.packageName} × ${i.quantity}</td><td align="right">$${Number(i.lineTotal).toFixed(2)}</td></tr>`)
    .join('');
  const html = emailLayout(
    siteName,
    `Payment received — order ${order.code}`,
    `<p>Thank you for your purchase! We received your payment of <b>$${Number(order.total).toFixed(2)}</b>.</p>
     <table width="100%" style="font-size:14px;border-collapse:collapse">${rows}</table>
     <p>Track your order and view delivered items here:<br>
     <a href="${appUrl}/orders/${order.code}">${appUrl}/orders/${order.code}</a></p>`
  );
  const itemsText = order.items
    .map((i) => `• ${escapeHtml(`${i.productName} — ${i.packageName}`)} ×${i.quantity}`)
    .join('\n');
  await notifyUser(order.userId, {
    subject: `Your ${siteName} order ${order.code}`,
    html,
    text: `<b>Payment received — order ${order.code}</b>\n${itemsText}\nTotal: $${Number(order.total).toFixed(2)}\n\n${appUrl}/orders/${order.code}`,
  });
}
