/**
 * Report Scheduler
 * Tự động gửi báo cáo Telegram định kỳ cho admin.
 *
 * - Báo cáo NGÀY: 21:00 mỗi ngày
 * - Báo cáo TUẦN: 21:00 Chủ nhật
 * - Báo cáo THÁNG: 21:00 ngày cuối tháng
 *
 * Dùng setInterval check mỗi phút (đơn giản, không cần cron lib).
 * Chỉ gửi nếu admin bật telegram_daily_report = true.
 */

import prisma from '../db';
import { sendReport } from '../services/telegram';
import { getProvider } from './providers';
import { syncPendingSmmOrders } from '../routes/smm';

const FINAL_SMM = ['completed', 'failed', 'canceled', 'cancelled', 'partial', 'refunded'];
let lastSmmOrderSync = 0;
// Auto-sync trạng thái đơn SMM API mỗi 5 phút (chỉ khi có đơn chưa hoàn tất).
async function maybeSyncSmmOrders(): Promise<void> {
  const now = Date.now();
  if (now - lastSmmOrderSync < 5 * 60 * 1000) return;
  lastSmmOrderSync = now;
  const pending = await prisma.smmOrder.count({
    where: { deliveryType: 'api', externalOrderId: { not: null }, status: { notIn: FINAL_SMM } },
  });
  if (pending === 0) return;
  const r = await syncPendingSmmOrders();
  if (r.updated) console.log(`[auto-sync] SMM đơn: cập nhật ${r.updated}/${r.checked}`);
}

let lastDayKey = '';
let lastWeekKey = '';
let lastMonthKey = '';

function isLastDayOfMonth(d: Date): boolean {
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return next.getMonth() !== d.getMonth();
}

async function tick(): Promise<void> {
  try {
    // Chỉ chạy nếu có ít nhất 1 bot bật nhận báo cáo
    const reportBots = await prisma.telegramBot.count({ where: { isActive: true, receiveReports: true } });
    if (reportBots === 0) return;

    const now = new Date();
    // Chỉ chạy lúc 21:00 (giờ server)
    if (now.getHours() !== 21 || now.getMinutes() !== 0) return;

    const dayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

    // Báo cáo ngày — mỗi ngày 1 lần
    if (lastDayKey !== dayKey) {
      lastDayKey = dayKey;
      await sendReport('day');

      // Chủ nhật (0) → báo cáo tuần
      if (now.getDay() === 0 && lastWeekKey !== dayKey) {
        lastWeekKey = dayKey;
        await sendReport('week');
      }

      // Ngày cuối tháng → báo cáo tháng
      if (isLastDayOfMonth(now) && lastMonthKey !== dayKey) {
        lastMonthKey = dayKey;
        await sendReport('month');
      }
    }
  } catch (e) {
    console.error('Report scheduler error:', e);
  }

  // SMM scheduled & repeat (chạy mỗi tick, độc lập với báo cáo)
  try { await processScheduledSmm(); } catch (e) { console.error('SMM scheduled error:', e); }
  try { await processRepeatSmm(); } catch (e) { console.error('SMM repeat error:', e); }
  // Tự hủy đơn chờ thanh toán quá hạn + hoàn điểm
  try { await processExpiredOrders(); } catch (e) { console.error('Expire orders error:', e); }
  // Auto-sync trạng thái đơn SMM API (throttle 5 phút)
  try { await maybeSyncSmmOrders(); } catch (e) { console.error('SMM auto-sync error:', e); }
  // Nhắc gia hạn gói premium sắp hết hạn (throttle 1 giờ)
  try { await maybeRemindEntitlements(); } catch (e) { console.error('Entitlement reminder error:', e); }
}

// ── Nhắc hết hạn gói premium ───────────────────────────
let lastEntitlementRun = 0;
async function maybeRemindEntitlements(): Promise<void> {
  const now = Date.now();
  if (now - lastEntitlementRun < 60 * 60 * 1000) return; // 1 giờ/lần
  lastEntitlementRun = now;

  const cfg = await prisma.siteConfig.findUnique({ where: { key: 'entitlement_reminder_days' } });
  const days = cfg ? parseInt(cfg.value || '3', 10) : 3;
  const reminderDays = Number.isFinite(days) && days > 0 ? days : 3;

  const { createNotification } = await import('./notify');
  const { sendMail } = await import('./mail');
  const nowDate = new Date();
  const soon = new Date(nowDate.getTime() + reminderDays * 86400000);

  // 1) Sắp hết hạn → nhắc 1 lần
  const expiringSoon = await prisma.userEntitlement.findMany({
    where: { status: 'active', reminderSent: false, expiresAt: { gt: nowDate, lte: soon } },
    take: 100,
  });
  for (const e of expiringSoon) {
    try {
      const left = Math.ceil((new Date(e.expiresAt).getTime() - nowDate.getTime()) / 86400000);
      await prisma.userEntitlement.update({ where: { id: e.id }, data: { reminderSent: true } });
      createNotification(e.userId, {
        type: 'system',
        title: `⏳ ${e.productName} sắp hết hạn`,
        body: `Còn ${left} ngày. Gia hạn ngay để không gián đoạn sử dụng.`,
        link: '/dashboard/subscriptions',
      }).catch(() => {});
      const user = await prisma.user.findUnique({ where: { id: e.userId } });
      if (user?.email) {
        sendMail({
          to: user.email,
          subject: `Gói ${e.productName} của bạn sắp hết hạn`,
          html: `<p>Gói <b>${e.productName}${e.packageName ? ' - ' + e.packageName : ''}</b> sẽ hết hạn sau <b>${left} ngày</b> (${new Date(e.expiresAt).toLocaleDateString('vi-VN')}).</p>
                 <p>Hãy gia hạn để tiếp tục sử dụng.</p>`,
        }).catch(() => {});
      }
    } catch (err) {
      console.error(`Entitlement remind ${e.id} failed:`, err);
    }
  }

  // 2) Đã hết hạn → đánh dấu expired + thông báo 1 lần
  const expired = await prisma.userEntitlement.findMany({
    where: { status: 'active', expiresAt: { lte: nowDate } },
    take: 100,
  });
  for (const e of expired) {
    try {
      await prisma.userEntitlement.update({ where: { id: e.id }, data: { status: 'expired', expiredNotified: true } });
      createNotification(e.userId, {
        type: 'system',
        title: `❌ ${e.productName} đã hết hạn`,
        body: 'Gia hạn ngay để tiếp tục sử dụng.',
        link: '/dashboard/subscriptions',
      }).catch(() => {});
    } catch (err) {
      console.error(`Entitlement expire ${e.id} failed:`, err);
    }
  }
}

// ── Tự hủy đơn chờ thanh toán quá hạn ──────────────────
/**
 * Hủy các đơn còn 'pending'/'pending_payment' tạo đã lâu hơn `order_expiry_minutes`
 * và hoàn lại điểm đã đổi. Tắt khi config <= 0 (mặc định tắt).
 */
async function processExpiredOrders(): Promise<void> {
  const cfg = await prisma.siteConfig.findUnique({ where: { key: 'order_expiry_minutes' } });
  const minutes = cfg ? parseInt(cfg.value || '0', 10) : 0;
  if (!Number.isFinite(minutes) || minutes <= 0) return;

  const cutoff = new Date(Date.now() - minutes * 60000);
  const orders = await prisma.order.findMany({
    where: { status: { in: ['pending', 'pending_payment'] }, createdAt: { lt: cutoff } },
    take: 50,
    select: { id: true, orderCode: true, userId: true },
  });
  if (!orders.length) return;

  const { refundPointsForOrder } = await import('./loyalty');
  const { createNotification } = await import('./notify');
  for (const o of orders) {
    try {
      await prisma.order.update({
        where: { id: o.id },
        data: { status: 'cancelled', notes: 'Tự hủy do quá hạn thanh toán' },
      });
      await refundPointsForOrder(o.userId, o.orderCode);
      createNotification(o.userId, {
        type: 'order',
        title: `Đơn ${o.orderCode} đã hủy`,
        body: 'Đơn quá hạn thanh toán nên đã tự hủy.',
        link: `/orders/${o.orderCode}`,
      }).catch(() => {});
    } catch (e) {
      console.error(`Expire order ${o.id} failed:`, e);
    }
  }
}


// ── SMM scheduled & repeat orders ──────────────────────
/** Xử lý đơn SMM đã đặt lịch (scheduled_at <= now) */
async function processScheduledSmm(): Promise<void> {
  const now = new Date();
  const orders = await prisma.smmOrder.findMany({
    where: { status: 'scheduled', scheduledAt: { lte: now } },
    include: { smmService: { include: { apiProvider: true } } },
    take: 20,
  });
  for (const order of orders) {
    try {
      const svc = order.smmService;
      let newStatus = 'pending';
      let externalId: string | null = null;
      if (svc?.deliveryType === 'api' && svc.apiProvider && svc.externalServiceId) {
        const adapter = getProvider(svc.apiProvider);
        const extras = order.extras ? JSON.parse(order.extras) : {};
        const result = await adapter.createOrder(svc.externalServiceId, order.link, order.quantity, extras);
        externalId = result.orderId || null;
        newStatus = result.orderId ? result.status : 'failed';
      }
      await prisma.smmOrder.update({ where: { id: order.id }, data: { status: newStatus, externalOrderId: externalId } });
    } catch (e) {
      console.error(`SMM scheduled order ${order.id} failed:`, e);
    }
  }
}

/** Tạo đơn lặp lại cho đơn đã hoàn thành còn repeat_remaining */
async function processRepeatSmm(): Promise<void> {
  const now = new Date();
  const orders = await prisma.smmOrder.findMany({
    where: { status: { in: ['completed', 'partial'] }, repeatRemaining: { gt: 0 }, repeatInterval: { gt: 0 } },
    take: 20,
  });
  for (const order of orders) {
    const lastTime = order.updatedAt || order.createdAt;
    const nextTime = new Date(lastTime.getTime() + (order.repeatInterval || 0) * 60000);
    if (now < nextTime) continue;
    try {
      // Tạo đơn con (bản sao, scheduled chạy ngay)
      const { genOrderCode } = await import('./orders');
      await prisma.smmOrder.create({
        data: {
          orderCode: genOrderCode(),
          userId: order.userId,
          smmServiceId: order.smmServiceId,
          platformName: order.platformName,
          categoryName: order.categoryName,
          serviceName: order.serviceName,
          link: order.link,
          quantity: order.quantity,
          charge: order.charge,
          serviceType: order.serviceType,
          extras: order.extras,
          deliveryType: order.deliveryType,
          apiProviderId: order.apiProviderId,
          status: 'scheduled',
          scheduledAt: now,
        },
      });
      await prisma.smmOrder.update({ where: { id: order.id }, data: { repeatRemaining: { decrement: 1 } } });
    } catch (e) {
      console.error(`SMM repeat order ${order.id} failed:`, e);
    }
  }
}

let timer: NodeJS.Timeout | null = null;

/** Khởi động scheduler — check mỗi 60s */
export function startReportScheduler(): void {
  if (timer) return;
  timer = setInterval(tick, 60 * 1000);
  console.log('📅 Scheduler started: reports (21:00) + SMM scheduled/repeat orders');
}

export function stopReportScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
