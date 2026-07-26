import prisma from './db';
import { getActiveFlashPrices, effectivePrice } from './catalog';
import { checkCoupon } from './coupons';
import { generateOrderCode, parseCustomFields } from './utils';
import { getSetting } from './settings';
import { sendMail, emailLayout } from './mail';

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
  paymentMethod: 'stripe' | 'paypal';
}) {
  const { userId, email, items, couponCode, paymentMethod } = params;
  if (!items.length) throw new OrderError('Your cart is empty');
  if (items.length > 50) throw new OrderError('Too many items in one order');

  const packageIds = items.map((i) => i.packageId);
  const packages = await prisma.package.findMany({
    where: { id: { in: packageIds }, isActive: true, product: { isActive: true } },
    include: { product: { include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } } } },
  });
  const flash = await getActiveFlashPrices(packageIds);

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
  const total = Math.round((subtotal - discount) * 100) / 100;
  if (total < 0.5) throw new OrderError('Order total is below the payment minimum ($0.50)');

  const currency = (await getSetting('currency')) || 'USD';

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        code: generateOrderCode(),
        userId,
        email,
        subtotal,
        discount,
        total,
        currency,
        couponCode: appliedCoupon,
        paymentMethod,
        items: {
          create: orderItems.map(({ flashSaleItemId, ...it }) => it),
        },
      },
      include: { items: true },
    });
    if (couponId) {
      await tx.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } });
      await tx.couponRedemption.create({ data: { couponId, userId, orderId: created.id } });
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

// Marks an order paid (idempotent) and runs auto-delivery from stock pools.
export async function markOrderPaid(orderId: number, paymentRef?: string): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order || order.status !== 'PENDING') return;

  await prisma.order.update({
    where: { id: orderId },
    data: { status: 'PAID', paidAt: new Date(), ...(paymentRef ? { paymentRef } : {}) },
  });

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
}

// Delivers items whose package has auto-delivery enabled, pulling unsold
// stock items. Marks the order COMPLETED when every item is delivered.
export async function autoDeliver(orderId: number): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order || (order.status !== 'PAID' && order.status !== 'COMPLETED')) return;

  for (const item of order.items) {
    if (item.deliveredAt || !item.packageId) continue;
    const pkg = await prisma.package.findUnique({ where: { id: item.packageId } });
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
    if (delivered.length === item.quantity) {
      await prisma.orderItem.update({
        where: { id: item.id },
        data: { deliveryData: delivered.join('\n'), deliveredAt: new Date() },
      });
    } else if (delivered.length > 0) {
      // Partial stock — deliver what we have, admin completes the rest.
      await prisma.orderItem.update({
        where: { id: item.id },
        data: { deliveryData: delivered.join('\n') },
      });
    }
  }

  const remaining = await prisma.orderItem.count({ where: { orderId, deliveredAt: null } });
  if (remaining === 0) {
    await prisma.order.update({ where: { id: orderId }, data: { status: 'COMPLETED' } });
  }

  const deliveredAny = await prisma.orderItem.count({ where: { orderId, deliveryData: { not: null } } });
  if (deliveredAny > 0) await sendDeliveryEmail(orderId).catch(() => {});
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
  await sendMail(order.email, `Your ${siteName} order ${order.code} is ready`, html);
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
  await sendMail(order.email, `Your ${siteName} order ${order.code}`, html);
}
