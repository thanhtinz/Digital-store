/**
 * Stock alert — "báo có hàng lại".
 * Khi gói được nhập kho trở lại, thông báo (in-app + email) cho khách đã đăng ký.
 */
import prisma from '../db';
import { createNotification } from './notify';
import { sendMail } from './mail';

export async function notifyBackInStock(packageId: number): Promise<void> {
  try {
    const alerts = await prisma.stockAlert.findMany({
      where: { packageId, notified: false },
    });
    if (!alerts.length) return;

    const pkg = await prisma.productPackage.findUnique({
      where: { id: packageId },
      include: { product: true },
    });
    if (!pkg) return;

    const productName = pkg.product?.name || 'Sản phẩm';
    const slug = pkg.product?.slug;
    const link = slug ? `/dashboard/e-commerce/product/${slug}` : '/dashboard/e-commerce/shop';
    const url = `${process.env.PUBLIC_SITE_URL || ''}${link}`;

    await Promise.all(
      alerts.map(async (a: any) => {
        createNotification(a.userId, {
          type: 'order',
          title: `${productName} đã có hàng trở lại`,
          body: `Gói "${pkg.name}" bạn quan tâm đã có hàng. Mua ngay kẻo hết!`,
          link,
        }).catch(() => {});
        if (a.userEmail) {
          sendMail({
            to: a.userEmail,
            subject: `${productName} đã có hàng trở lại 🎉`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
                <h2 style="margin:0 0 8px">Có hàng trở lại!</h2>
                <p>Gói <b>${pkg.name}</b> của sản phẩm <b>${productName}</b> đã có hàng.</p>
                <p><a href="${url}" style="display:inline-block;padding:10px 18px;background:#1877F2;color:#fff;text-decoration:none;border-radius:8px">Mua ngay</a></p>
              </div>`,
            text: `${productName} - gói ${pkg.name} đã có hàng. Mua ngay: ${url}`,
          }).catch(() => {});
        }
      })
    );

    await prisma.stockAlert.updateMany({
      where: { packageId, notified: false },
      data: { notified: true },
    });
  } catch {
    /* không chặn luồng nhập kho nếu lỗi thông báo */
  }
}
