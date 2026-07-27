import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// GET — full JSON snapshot of the store (media binaries excluded for size).
// Admin-only; contains everything needed to rebuild the catalog, orders,
// customers and settings.
export const GET = handler(async () => {
  const admin = await requireAdmin();
  if (admin.role !== 'ADMIN') return jsonError(403, 'Only administrators can download backups');

  const [
    users, categories, products, images, packages, stockItems, banners,
    coupons, redemptions, flashSales, flashSaleItems, orders, orderItems,
    reviews, tickets, ticketMessages, settings, walletTxns, topups,
    giftCards, autoCouponRules, stockAlerts, posts,
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.category.findMany(),
    prisma.product.findMany(),
    prisma.productImage.findMany(),
    prisma.package.findMany(),
    prisma.stockItem.findMany(),
    prisma.banner.findMany(),
    prisma.coupon.findMany(),
    prisma.couponRedemption.findMany(),
    prisma.flashSale.findMany(),
    prisma.flashSaleItem.findMany(),
    prisma.order.findMany(),
    prisma.orderItem.findMany(),
    prisma.review.findMany(),
    prisma.supportTicket.findMany(),
    prisma.ticketMessage.findMany(),
    prisma.setting.findMany(),
    prisma.walletTransaction.findMany(),
    prisma.topup.findMany(),
    prisma.giftCard.findMany(),
    prisma.autoCouponRule.findMany(),
    prisma.stockAlert.findMany(),
    prisma.post.findMany(),
  ]);

  const backup = {
    format: 'digital-store-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    tables: {
      users, categories, products, productImages: images, packages, stockItems,
      banners, coupons, couponRedemptions: redemptions, flashSales, flashSaleItems,
      orders, orderItems, reviews, supportTickets: tickets, ticketMessages,
      settings, walletTransactions: walletTxns, topups, giftCards,
      autoCouponRules, stockAlerts, posts,
    },
  };

  audit(admin, 'backup.download', `${orders.length} orders, ${users.length} users`);
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(backup), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="store-backup-${stamp}.json"`,
    },
  });
});
