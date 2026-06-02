/**
 * Payment Routes - SePay Integration
 * Thay thế hoàn toàn PayOS bằng SePay
 */

import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireUser, requireAdmin } from '../middleware/auth';
import { paymentRateLimit, webhookRateLimit, statusRateLimit } from '../middleware/rateLimit';
import {
  createSepayPayment,
  checkSepayTransaction,
  verifySepayWebhook,
  getSepayConfigFromDb,
  extractOrderCodeFromContent,
  testSepayConnection,
  buildVietQrUrl,
  buildTransferContent,
} from '../services/sepay';
import { autoDeliver, orderToDict, money } from '../services/orders';
import { notifyNewOrder } from '../services/telegram';

const router = Router();

// ── Tạo link thanh toán SePay ──────────────────────────
router.post('/create-link', requireUser, paymentRateLimit, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { order_code } = req.body;

    const cfg = await getSepayConfigFromDb();
    if (!cfg.accountNumber || !cfg.bankCode) {
      res.status(503).json({ detail: 'Cổng thanh toán chưa được cấu hình' });
      return;
    }

    const order = await prisma.order.findFirst({
      where: {
        orderCode: order_code,
        userId: user.user_id.toString(),
        status: { in: ['pending', 'pending_payment'] },
      },
      include: {
        package: { include: { product: true } },
        items: { include: { package: { include: { product: true } } } },
      },
    });

    if (!order) {
      res.status(404).json({ detail: 'Không tìm thấy đơn hàng' });
      return;
    }

    // Nếu đã có link thanh toán, trả về lại
    if (order.paymentLinkId && order.status === 'pending_payment') {
      const amount = money(order.totalAmount);
      const transferContent = order.paymentLinkId;
      const qrCodeUrl = buildVietQrUrl({
        bankCode: cfg.bankCode,
        accountNumber: cfg.accountNumber,
        amount,
        content: transferContent,
      });
      res.json({
        orderCode: order.orderCode,
        transferContent,
        accountNumber: cfg.accountNumber,
        bankCode: cfg.bankCode,
        amount,
        qrCodeUrl,
        status: order.status,
        expiredAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        order: serializeOrderPayment(order),
      });
      return;
    }

    const amount = money(order.totalAmount);
    const info = await createSepayPayment(order.id, amount, order.orderCode);

    res.json({ ...info, order: serializeOrderPayment(order) });
  } catch (e: any) {
    res.status(500).json({ detail: `SePay error: ${e.message}` });
  }
});

// ── Lấy checkout data ──────────────────────────────────
router.get('/checkout-data/:order_code', requireUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { order_code } = req.params;

    const order = await prisma.order.findFirst({
      where: { orderCode: order_code, userId: user.user_id.toString() },
      include: {
        package: { include: { product: true } },
        items: { include: { package: { include: { product: true } } } },
      },
    });

    if (!order) {
      res.status(404).json({ detail: 'Không tìm thấy đơn hàng' });
      return;
    }

    const cfg = await getSepayConfigFromDb();
    const amount = money(order.totalAmount);
    const transferContent = order.paymentLinkId || buildTransferContent(order.orderCode);

    const qrCodeUrl = cfg.accountNumber && cfg.bankCode
      ? buildVietQrUrl({ bankCode: cfg.bankCode, accountNumber: cfg.accountNumber, amount, content: transferContent })
      : null;

    const payload: Record<string, any> = serializeOrderPayment(order);
    payload.sepay = {
      transferContent,
      accountNumber: cfg.accountNumber,
      bankCode: cfg.bankCode,
      amount,
      qrCodeUrl,
      status: order.status,
    };

    res.json(payload);
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// Throttle gọi API SePay theo từng đơn — tối đa 1 lần / khoảng dưới đây.
// Tránh việc user poll dày (vài giây/lần) làm nổ quota API SePay.
const SEPAY_CHECK_COOLDOWN_MS = 4000;
const lastSepayCheck = new Map<string, number>();
// Dọn map định kỳ để không phình bộ nhớ (đơn cũ không còn poll)
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [k, t] of lastSepayCheck) if (t < cutoff) lastSepayCheck.delete(k);
}, 10 * 60 * 1000).unref?.();

// ── Kiểm tra trạng thái thanh toán ────────────────────
router.get('/status/:order_code', requireUser, statusRateLimit, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { order_code } = req.params;

    const order = await prisma.order.findFirst({
      where: { orderCode: order_code, userId: user.user_id.toString() },
      include: { items: true },
    });

    if (!order) {
      res.status(404).json({ detail: 'Không tìm thấy đơn hàng' });
      return;
    }

    // Nếu còn pending, check SePay API — nhưng có cooldown theo đơn
    const last = lastSepayCheck.get(order.orderCode) || 0;
    const withinCooldown = Date.now() - last < SEPAY_CHECK_COOLDOWN_MS;
    if (order.status === 'pending_payment' && order.paymentLinkId && !withinCooldown) {
      lastSepayCheck.set(order.orderCode, Date.now());
      const paid = await checkSepayTransaction(order.paymentLinkId);
      if (paid) {
        const now = new Date();
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'paid', updatedAt: now },
        });
        await prisma.orderItem.updateMany({
          where: { orderId: order.id },
          data: { status: 'paid', updatedAt: now },
        });
        await autoDeliver(order.id);
        const updated = await prisma.order.findUnique({ where: { id: order.id } });
        res.json({
          orderCode: order.orderCode,
          status: updated?.status,
          deliveryData: updated?.status === 'completed' ? updated.deliveryData : null,
          paymentLinkId: order.paymentLinkId,
        });
        return;
      }
    }

    res.json({
      orderCode: order.orderCode,
      status: order.status,
      deliveryData: order.status === 'completed' ? order.deliveryData : null,
      paymentLinkId: order.paymentLinkId,
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── SePay Webhook ──────────────────────────────────────
router.post('/webhook/sepay', webhookRateLimit, async (req: Request, res: Response) => {
  try {
    const cfg = await getSepayConfigFromDb();
    const signature = req.headers['x-sepay-signature'] as string || '';

    // Fail-closed: bắt buộc cấu hình webhook secret + có chữ ký hợp lệ,
    // nếu không kẻ gian có thể giả webhook để đánh dấu đơn "đã thanh toán".
    if (!cfg.webhookSecret) {
      console.error('SePay webhook bị từ chối: chưa cấu hình sepay_webhook_secret');
      res.status(503).json({ success: false, message: 'Webhook chưa được cấu hình' });
      return;
    }
    if (!signature || !verifySepayWebhook(req.body, signature, cfg.webhookSecret)) {
      res.status(401).json({ success: false, message: 'Invalid signature' });
      return;
    }

    const body = req.body;
    // SePay gửi payload dạng:
    // { id, gateway, transactionDate, accountNumber, content, transferType, transferAmount, referenceCode, ... }
    const { transferType, transferAmount, content, code } = body;

    if (transferType !== 'in') {
      res.json({ success: true });
      return;
    }

    // Tìm đơn hàng từ nội dung chuyển khoản
    const extractedCode = extractOrderCodeFromContent(content || '');
    if (!extractedCode) {
      // Thử tìm theo amount + reference
      console.log('SePay webhook: cannot extract order code from content:', content);
      res.json({ success: true });
      return;
    }

    // Tìm đơn hàng theo transfer content hoặc order code
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { paymentLinkId: { contains: extractedCode } },
          { orderCode: extractedCode },
        ],
        status: { in: ['pending', 'pending_payment'] },
      },
      include: { items: true },
    });

    if (!order) {
      res.json({ success: true });
      return;
    }

    const expectedAmount = money(order.totalAmount);
    if (transferAmount < expectedAmount) {
      console.log(`SePay webhook: insufficient amount for ${order.orderCode}: got ${transferAmount}, expected ${expectedAmount}`);
      res.json({ success: true });
      return;
    }

    const now = new Date();
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'paid', updatedAt: now },
    });
    await prisma.orderItem.updateMany({
      where: { orderId: order.id },
      data: { status: 'paid', updatedAt: now },
    });

    await autoDeliver(order.id);
    notifyNewOrder(order.id, true).catch(() => {}); // thông báo đơn đã thanh toán
    res.json({ success: true });
  } catch (e: any) {
    console.error('SePay webhook error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Test kết nối SePay (admin) ─────────────────────────
router.post('/test', requireAdmin, paymentRateLimit, async (req: Request, res: Response) => {
  try {
    const { sepay_api_key, sepay_account_number } = req.body;
    const ok = await testSepayConnection(sepay_api_key, sepay_account_number);
    if (ok) {
      res.json({ message: 'Kết nối SePay thành công' });
    } else {
      res.status(400).json({ detail: 'Kết nối thất bại — kiểm tra lại API Key và số tài khoản' });
    }
  } catch (e: any) {
    res.status(400).json({ detail: `Test thất bại: ${e.message}` });
  }
});

// ── Helper ─────────────────────────────────────────────
function serializeOrderPayment(order: any): Record<string, any> {
  const orderItems = order.items || [];
  const items = orderItems.length > 0
    ? orderItems.map((item: any) => ({
        product_name: item.productNameSnapshot || item.package?.product?.name || 'Sản phẩm số',
        package_name: item.packageNameSnapshot || item.package?.name || 'Gói',
        quantity: item.quantity || 1,
        line_total: money(item.lineTotal),
        product_img: item.productImgSnapshot || item.package?.product?.imageUrl,
      }))
    : [{
        product_name: order.package?.product?.name || 'Sản phẩm số',
        package_name: order.package?.name || 'Gói',
        quantity: order.quantity || 1,
        line_total: money(order.totalAmount),
        product_img: order.package?.product?.imageUrl,
      }];

  return {
    order_code: order.orderCode,
    status: order.status,
    payment_method: order.paymentMethod,
    payment_link_id: order.paymentLinkId,
    total_amount: money(order.totalAmount),
    created_at: order.createdAt?.toISOString(),
    user_email: order.userEmail,
    items,
  };
}

// ── Cấu hình SePay (admin) ─────────────────────────────
router.get('/config', requireAdmin, async (_req: Request, res: Response) => {
  const keys = ['sepay_api_key', 'sepay_account_number', 'sepay_bank_code', 'sepay_webhook_secret', 'app_base_url'];
  const configs = await prisma.siteConfig.findMany({ where: { key: { in: keys } } });
  const map: Record<string, string> = Object.fromEntries(
    configs.map((c: { key: string; value: string | null }) => [c.key, c.value || ''])
  );
  res.json({
    sepay_api_key: map['sepay_api_key'] ? '••••••••' : '',
    sepay_account_number: map['sepay_account_number'] || '',
    sepay_bank_code: map['sepay_bank_code'] || '',
    sepay_webhook_secret: map['sepay_webhook_secret'] ? '••••••••' : '',
    app_base_url: map['app_base_url'] || process.env.APP_BASE_URL || '',
    has_env_override: !!(process.env.SEPAY_API_KEY),
  });
});

router.post('/config', requireAdmin, async (req: Request, res: Response) => {
  const keys = ['sepay_api_key', 'sepay_account_number', 'sepay_bank_code', 'sepay_webhook_secret', 'app_base_url'];
  const b = req.body as Record<string, string>;
  const updates: Array<{ key: string; value: string }> = [];
  for (const key of keys) {
    if (b[key] === undefined) continue;
    if ((key === 'sepay_api_key' || key === 'sepay_webhook_secret') && (b[key] === '' || b[key] === '••••••••')) continue;
    updates.push({ key, value: b[key] });
  }
  await Promise.all(updates.map((u) =>
    prisma.siteConfig.upsert({ where: { key: u.key }, update: { value: u.value }, create: { key: u.key, value: u.value } })
  ));
  res.json({ message: 'Đã lưu cấu hình SePay' });
});

export default router;
