/**
 * Telegram Admin Bot Service — ĐA KÊNH (multi-bot phân type theo bộ phận)
 *
 * Mỗi bot (model TelegramBot): name, department, botToken, chatId,
 * notifyTypes (mảng loại thông báo nhận), receiveReports.
 * Sự kiện → gửi tới mọi bot bật có chứa type tương ứng.
 */

import axios from 'axios';
import prisma from '../db';
import { money } from './orders';

const TG_API = 'https://api.telegram.org';

export const NOTIFY_TYPES = [
  { id: 'new_order', label: 'Đơn hàng mới' },
  { id: 'paid_order', label: 'Đơn đã thanh toán' },
  { id: 'new_user', label: 'Người dùng đăng ký' },
  { id: 'withdrawal', label: 'Yêu cầu rút tiền' },
  { id: 'card_charge', label: 'Nạp thẻ' },
  { id: 'smm_order', label: 'Đơn SMM' },
  { id: 'low_stock', label: 'Cảnh báo hết hàng' },
  { id: 'affiliate', label: 'Affiliate / hoa hồng' },
  { id: 'error', label: 'Lỗi hệ thống' },
];

function fmtVnd(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(n)) + 'đ';
}

async function sendToBot(botToken: string, chatId: string, text: string): Promise<boolean> {
  if (!botToken || !chatId) return false;
  try {
    const resp = await axios.post(
      `${TG_API}/bot${botToken}/sendMessage`,
      { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true },
      { timeout: 10000 }
    );
    return resp.status === 200;
  } catch {
    return false;
  }
}

/** Gửi thông báo theo type — fan-out tới mọi bot bật có nhận type này */
export async function notify(type: string, text: string): Promise<void> {
  try {
    const bots = await prisma.telegramBot.findMany({ where: { isActive: true } });
    const targets = bots.filter((b: any) => {
      const types = Array.isArray(b.notifyTypes) ? b.notifyTypes : [];
      return types.includes(type);
    });
    await Promise.all(targets.map((b: any) => sendToBot(b.botToken, b.chatId, text)));
  } catch { /* không chặn luồng chính */ }
}

export async function notifyReport(text: string): Promise<void> {
  try {
    const bots = await prisma.telegramBot.findMany({ where: { isActive: true, receiveReports: true } });
    await Promise.all(bots.map((b: any) => sendToBot(b.botToken, b.chatId, text)));
  } catch { /* ignore */ }
}

export async function testTelegramConnection(token: string): Promise<{ ok: boolean; username?: string; error?: string }> {
  try {
    const resp = await axios.get(`${TG_API}/bot${token}/getMe`, { timeout: 10000 });
    if (resp.data?.ok) return { ok: true, username: resp.data.result?.username };
    return { ok: false, error: 'Token không hợp lệ' };
  } catch (e: any) {
    return { ok: false, error: e.response?.data?.description || e.message };
  }
}

// ── Thông báo sự kiện ──────────────────────────────────
export async function notifyNewOrder(orderId: number, paid = false): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { package: { include: { product: true } }, items: true },
  });
  if (!order) return;
  const itemDesc = order.items.length
    ? order.items.map((i: any) => `• ${i.productNameSnapshot || ''} - ${i.packageNameSnapshot || ''} x${i.quantity}`).join('\n')
    : `• ${order.package?.product?.name || ''} - ${order.package?.name || ''} x${order.quantity}`;
  const title = paid ? '💰 <b>ĐƠN ĐÃ THANH TOÁN</b>' : '🛒 <b>ĐƠN HÀNG MỚI</b>';
  const msg = [title, '', `Mã đơn: <code>${order.orderCode}</code>`, `Khách: ${order.userEmail || '—'}`, itemDesc, `Tổng tiền: <b>${fmtVnd(money(order.totalAmount))}</b>`, `Thanh toán: ${order.paymentMethod}`, `Trạng thái: ${order.status}`].join('\n');
  await notify(paid ? 'paid_order' : 'new_order', msg);
}

export async function notifyNewUser(userId: number): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  const total = await prisma.user.count();
  await notify('new_user', ['👤 <b>NGƯỜI DÙNG MỚI</b>', '', `Email: ${user.email}`, `Tên: ${user.displayName || '—'}`, `Nguồn: ${user.provider}`, `Tổng user: <b>${total}</b>`].join('\n'));
}

export async function notifyWithdrawal(email: string, amount: number): Promise<void> {
  await notify('withdrawal', ['💸 <b>YÊU CẦU RÚT TIỀN</b>', '', `Khách: ${email}`, `Số tiền: <b>${fmtVnd(amount)}</b>`, 'Vào admin để duyệt.'].join('\n'));
}

export async function notifyCardCharge(email: string, telco: string, amount: number): Promise<void> {
  await notify('card_charge', ['💳 <b>NẠP THẺ MỚI</b>', '', `Khách: ${email}`, `Nhà mạng: ${telco}`, `Mệnh giá: <b>${fmtVnd(amount)}</b>`].join('\n'));
}

export async function notifySmmOrder(orderCode: string, service: string, charge: number): Promise<void> {
  await notify('smm_order', ['📱 <b>ĐƠN SMM MỚI</b>', '', `Mã: <code>${orderCode}</code>`, `Dịch vụ: ${service}`, `Tiền: <b>${fmtVnd(charge)}</b>`].join('\n'));
}

export async function notifyLowStock(productName: string, packageName: string, remaining: number): Promise<void> {
  await notify('low_stock', ['⚠️ <b>CẢNH BÁO HẾT HÀNG</b>', '', `Sản phẩm: ${productName}`, `Gói: ${packageName}`, `Còn lại: <b>${remaining}</b> item`].join('\n'));
}

export async function notifyError(context: string, message: string): Promise<void> {
  await notify('error', ['🔴 <b>LỖI HỆ THỐNG</b>', '', `Ngữ cảnh: ${context}`, `Chi tiết: ${message}`].join('\n'));
}

export async function notifyAffiliate(email: string, commission: number): Promise<void> {
  await notify('affiliate', ['🤝 <b>HOA HỒNG AFFILIATE</b>', '', `Affiliate: ${email}`, `Hoa hồng: <b>${fmtVnd(commission)}</b>`].join('\n'));
}

// ── Báo cáo ────────────────────────────────────────────
async function getStatsForPeriod(since: Date) {
  const [orderAgg, completedAgg, newUsers] = await Promise.all([
    prisma.order.aggregate({ where: { createdAt: { gte: since } }, _count: true }),
    prisma.order.aggregate({ where: { createdAt: { gte: since }, status: { in: ['paid', 'completed'] } }, _count: true, _sum: { totalAmount: true } }),
    prisma.user.count({ where: { createdAt: { gte: since } } }),
  ]);
  return { orders: orderAgg._count, completedOrders: completedAgg._count, revenue: money(completedAgg._sum.totalAmount), newUsers };
}

export async function getTopProducts(since: Date, limit = 10) {
  const items = await prisma.orderItem.findMany({
    where: { status: { in: ['paid', 'completed'] }, order: { createdAt: { gte: since } } },
    select: { productNameSnapshot: true, quantity: true, lineTotal: true },
  });
  const map = new Map<string, { qty: number; revenue: number }>();
  for (const it of items) {
    const name = it.productNameSnapshot || 'Khác';
    const cur = map.get(name) || { qty: 0, revenue: 0 };
    cur.qty += it.quantity || 0; cur.revenue += money(it.lineTotal); map.set(name, cur);
  }
  return Array.from(map.entries()).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.qty - a.qty).slice(0, limit);
}

export async function getTopSpenders(since: Date, limit = 10) {
  const orders = await prisma.order.findMany({
    where: { status: { in: ['paid', 'completed'] }, createdAt: { gte: since } },
    select: { userEmail: true, totalAmount: true },
  });
  const map = new Map<string, { spent: number; orders: number }>();
  for (const o of orders) {
    const email = o.userEmail || 'unknown';
    const cur = map.get(email) || { spent: 0, orders: 0 };
    cur.spent += money(o.totalAmount); cur.orders += 1; map.set(email, cur);
  }
  return Array.from(map.entries()).map(([email, v]) => ({ email, ...v })).sort((a, b) => b.spent - a.spent).slice(0, limit);
}

function periodLabel(kind: 'day' | 'week' | 'month'): { label: string; since: Date } {
  const now = new Date();
  if (kind === 'day') return { label: 'HÔM NAY', since: new Date(now.getFullYear(), now.getMonth(), now.getDate()) };
  if (kind === 'week') return { label: '7 NGÀY QUA', since: new Date(now.getTime() - 7 * 86400000) };
  return { label: 'THÁNG NÀY', since: new Date(now.getFullYear(), now.getMonth(), 1) };
}

export async function buildReport(kind: 'day' | 'week' | 'month'): Promise<string> {
  const { label, since } = periodLabel(kind);
  const stats = await getStatsForPeriod(since);
  const topProducts = await getTopProducts(since, 5);
  const topSpenders = await getTopSpenders(since, 5);
  const lines = [`📊 <b>BÁO CÁO ${label}</b>`, '', `💰 Doanh thu: <b>${fmtVnd(stats.revenue)}</b>`, `🧾 Đơn hàng: ${stats.orders} (hoàn tất: ${stats.completedOrders})`, `👥 User mới: ${stats.newUsers}`];
  if (topProducts.length) {
    lines.push('', '🔥 <b>Top sản phẩm</b>');
    topProducts.forEach((p, i) => lines.push(`${i + 1}. ${p.name} — ${p.qty} đơn (${fmtVnd(p.revenue)})`));
  }
  if (topSpenders.length) {
    lines.push('', '🏆 <b>Top chi tiêu</b>');
    topSpenders.forEach((s, i) => lines.push(`${['🥇', '🥈', '🥉'][i] || (i + 1) + '.'} ${s.email} — ${fmtVnd(s.spent)} (${s.orders} đơn)`));
  }
  return lines.join('\n');
}

export async function sendReport(kind: 'day' | 'week' | 'month'): Promise<void> {
  await notifyReport(await buildReport(kind));
}

// ── Lệnh bot (webhook) ─────────────────────────────────
const HELP_TEXT = ['🤖 <b>Lệnh quản trị</b>', '', '/stats — Tổng quan', '/today — Báo cáo hôm nay', '/week — Báo cáo 7 ngày', '/month — Báo cáo tháng', '/top — Top sản phẩm', '/ranking — BXH chi tiêu', '/pending — Đơn chờ xử lý', '/help — Danh sách lệnh'].join('\n');

async function buildOverview(): Promise<string> {
  const [users, orders, products, revenueAgg, pending] = await Promise.all([
    prisma.user.count(), prisma.order.count(), prisma.product.count({ where: { isActive: true } }),
    prisma.order.aggregate({ where: { status: { in: ['paid', 'completed'] } }, _sum: { totalAmount: true } }),
    prisma.order.count({ where: { status: 'pending' } }),
  ]);
  return ['📈 <b>TỔNG QUAN HỆ THỐNG</b>', '', `👥 User: <b>${users}</b>`, `🧾 Đơn: <b>${orders}</b> (chờ: ${pending})`, `📦 Sản phẩm: <b>${products}</b>`, `💰 Doanh thu: <b>${fmtVnd(money(revenueAgg._sum.totalAmount))}</b>`].join('\n');
}

export async function handleTelegramUpdate(botToken: string, update: any): Promise<void> {
  const message = update?.message;
  if (!message?.text) return;
  const chatId = String(message.chat?.id || '');
  const text = String(message.text).trim().toLowerCase().split(/\s|@/)[0];

  const bot = await prisma.telegramBot.findFirst({ where: { botToken, isActive: true } });
  if (!bot || String(bot.chatId) !== chatId) {
    await sendToBot(botToken, chatId, '⛔ Bạn không có quyền sử dụng bot này.');
    return;
  }

  let reply = '';
  switch (text) {
    case '/start': case '/help': reply = HELP_TEXT; break;
    case '/stats': reply = await buildOverview(); break;
    case '/today': reply = await buildReport('day'); break;
    case '/week': reply = await buildReport('week'); break;
    case '/month': reply = await buildReport('month'); break;
    case '/pending': {
      const cnt = await prisma.order.count({ where: { status: 'pending' } });
      reply = `🧾 Đang có <b>${cnt}</b> đơn chờ xử lý.`; break;
    }
    case '/top': {
      const top = await getTopProducts(new Date(Date.now() - 30 * 86400000), 10);
      reply = top.length ? '🔥 <b>Top sản phẩm 30 ngày</b>\n\n' + top.map((p, i) => `${i + 1}. ${p.name} — ${p.qty} đơn (${fmtVnd(p.revenue)})`).join('\n') : 'Chưa có dữ liệu.'; break;
    }
    case '/ranking': {
      const r = await getTopSpenders(new Date(Date.now() - 30 * 86400000), 10);
      reply = r.length ? '🏆 <b>BXH chi tiêu 30 ngày</b>\n\n' + r.map((s, i) => `${['🥇', '🥈', '🥉'][i] || (i + 1) + '.'} ${s.email} — ${fmtVnd(s.spent)} (${s.orders} đơn)`).join('\n') : 'Chưa có dữ liệu.'; break;
    }
    default: reply = '❓ Lệnh không hợp lệ. Gõ /help.';
  }
  await sendToBot(botToken, chatId, reply);
}

export { sendToBot };
