/**
 * Tạo "quyền sử dụng có hạn" (UserEntitlement) khi đơn hoàn tất, dựa trên
 * durationDays của gói. Dùng để nhắc khách gia hạn trước khi hết hạn.
 * Idempotent theo orderId+packageId. Không ném lỗi.
 */
import prisma from '../db';

export async function createEntitlementsForOrder(orderId: number): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        package: { include: { product: true } },
        items: { include: { package: { include: { product: true } } } },
      },
    });
    if (!order) return;
    // Chỉ áp dụng cho user thật (userId là số). Khách vãng lai (guest:...) bỏ qua.
    const uid = parseInt(order.userId, 10);
    if (!uid || Number.isNaN(uid) || String(uid) !== order.userId) return;

    const lines: { pkg: any; qty: number }[] = [];
    if (order.items.length > 0) {
      order.items.forEach((it: any) => it.package && lines.push({ pkg: it.package, qty: it.quantity || 1 }));
    } else if (order.package) {
      lines.push({ pkg: order.package, qty: order.quantity || 1 });
    }

    for (const { pkg } of lines) {
      const days = pkg?.durationDays;
      if (!days || days <= 0) continue;
      // Bỏ qua nếu đã tạo cho đơn+gói này.
      const exists = await prisma.userEntitlement.findFirst({ where: { orderId, packageId: pkg.id } });
      if (exists) continue;
      const now = new Date();
      const expires = new Date(now.getTime() + days * 86400000);
      await prisma.userEntitlement.create({
        data: {
          userId: uid,
          packageId: pkg.id,
          orderId,
          productName: pkg.product?.name || 'Sản phẩm',
          packageName: pkg.name || null,
          startsAt: now,
          expiresAt: expires,
        },
      });
    }
  } catch {
    /* nuốt lỗi */
  }
}
