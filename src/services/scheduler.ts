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
