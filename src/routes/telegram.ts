/**
 * Telegram Bot Routes — quản lý NHIỀU bot phân type theo bộ phận
 *  - GET/POST/PUT/DELETE /telegram/bots[/:id]  → CRUD bot
 *  - POST /telegram/bots/:id/test               → test token
 *  - POST /telegram/bots/:id/test-message       → gửi tin test
 *  - POST /telegram/bots/:id/set-webhook        → đăng ký webhook
 *  - GET  /telegram/notify-types                → danh sách loại thông báo
 *  - POST /telegram/send-report                 → gửi báo cáo thủ công
 *  - POST /telegram/webhook/:token              → nhận update (public)
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';
import prisma from '../db';
import { requireAdmin } from '../middleware/auth';
import {
  NOTIFY_TYPES, testTelegramConnection, handleTelegramUpdate,
  sendReport, sendToBot,
} from '../services/telegram';

const router = Router();

function botToDict(b: any) {
  return {
    id: b.id,
    name: b.name,
    department: b.department,
    bot_token: b.botToken ? '••••••••' : '',
    bot_token_set: !!b.botToken,
    chat_id: b.chatId,
    notify_types: Array.isArray(b.notifyTypes) ? b.notifyTypes : [],
    receive_reports: b.receiveReports,
    is_active: b.isActive,
    created_at: b.createdAt?.toISOString(),
  };
}

/** Danh sách loại thông báo khả dụng */
router.get('/notify-types', requireAdmin, (_req: Request, res: Response) => {
  res.json(NOTIFY_TYPES);
});

/** Webhook nhận update — token trong URL xác định bot */
router.post('/webhook/:token', async (req: Request, res: Response) => {
  try {
    res.json({ ok: true }); // phản hồi ngay
    await handleTelegramUpdate(req.params.token, req.body);
  } catch { /* đã trả 200 */ }
});

/** Danh sách bot */
router.get('/bots', requireAdmin, async (_req: Request, res: Response) => {
  const bots = await prisma.telegramBot.findMany({ orderBy: { id: 'asc' } });
  res.json(bots.map(botToDict));
});

/** Tạo bot mới */
router.post('/bots', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, department, bot_token, chat_id, notify_types, receive_reports, is_active } = req.body;
    if (!name || !bot_token || !chat_id) { res.status(422).json({ detail: 'Thiếu tên / token / chat ID' }); return; }
    const bot = await prisma.telegramBot.create({
      data: {
        name,
        department: department || 'custom',
        botToken: bot_token,
        chatId: String(chat_id),
        notifyTypes: Array.isArray(notify_types) ? notify_types : [],
        receiveReports: !!receive_reports,
        isActive: is_active !== false,
      },
    });
    res.status(201).json(botToDict(bot));
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

/** Cập nhật bot */
router.put('/bots/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const b = req.body;
    const data: any = {};
    if (b.name !== undefined) data.name = b.name;
    if (b.department !== undefined) data.department = b.department;
    if (b.bot_token !== undefined && b.bot_token && b.bot_token !== '••••••••') data.botToken = b.bot_token;
    if (b.chat_id !== undefined) data.chatId = String(b.chat_id);
    if (b.notify_types !== undefined) data.notifyTypes = Array.isArray(b.notify_types) ? b.notify_types : [];
    if (b.receive_reports !== undefined) data.receiveReports = !!b.receive_reports;
    if (b.is_active !== undefined) data.isActive = b.is_active;
    const bot = await prisma.telegramBot.update({ where: { id: parseInt(req.params.id) }, data });
    res.json(botToDict(bot));
  } catch (e: any) {
    res.status(e.code === 'P2025' ? 404 : 500).json({ detail: e.message });
  }
});

/** Xóa bot */
router.delete('/bots/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.telegramBot.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

/** Test token của 1 bot */
router.post('/bots/:id/test', requireAdmin, async (req: Request, res: Response) => {
  try {
    const bot = await prisma.telegramBot.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!bot) { res.status(404).json({ detail: 'Không tìm thấy bot' }); return; }
    const token = (req.body.token && req.body.token !== '••••••••') ? req.body.token : bot.botToken;
    const result = await testTelegramConnection(token);
    if (result.ok) res.json({ message: `Kết nối thành công: @${result.username}`, username: result.username });
    else res.status(400).json({ detail: result.error });
  } catch (e: any) {
    res.status(400).json({ detail: e.message });
  }
});

/** Gửi tin test tới chat của bot */
router.post('/bots/:id/test-message', requireAdmin, async (req: Request, res: Response) => {
  try {
    const bot = await prisma.telegramBot.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!bot) { res.status(404).json({ detail: 'Không tìm thấy bot' }); return; }
    const ok = await sendToBot(bot.botToken, bot.chatId, `✅ Tin nhắn test từ bot <b>${bot.name}</b> (${bot.department}).`);
    if (ok) res.json({ message: 'Đã gửi tin nhắn test' });
    else res.status(400).json({ detail: 'Gửi thất bại — kiểm tra token và chat ID' });
  } catch (e: any) {
    res.status(400).json({ detail: e.message });
  }
});

/** Đăng ký webhook cho 1 bot */
router.post('/bots/:id/set-webhook', requireAdmin, async (req: Request, res: Response) => {
  try {
    const bot = await prisma.telegramBot.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!bot) { res.status(404).json({ detail: 'Không tìm thấy bot' }); return; }
    const baseUrl = (process.env.APP_BASE_URL || '').replace(/\/$/, '');
    if (!baseUrl) { res.status(400).json({ detail: 'Chưa cấu hình APP_BASE_URL' }); return; }
    const webhookUrl = `${baseUrl}/api/telegram/webhook/${bot.botToken}`;
    const resp = await axios.post(`https://api.telegram.org/bot${bot.botToken}/setWebhook`, { url: webhookUrl, allowed_updates: ['message'] });
    if (resp.data?.ok) res.json({ message: 'Đã đăng ký webhook', webhook_url: webhookUrl });
    else res.status(400).json({ detail: resp.data?.description || 'Thất bại' });
  } catch (e: any) {
    res.status(400).json({ detail: e.response?.data?.description || e.message });
  }
});

/** Gửi báo cáo thủ công tới các bot nhận báo cáo */
router.post('/send-report', requireAdmin, async (req: Request, res: Response) => {
  try {
    const kind = (req.body.kind || 'day') as 'day' | 'week' | 'month';
    await sendReport(kind);
    res.json({ message: `Đã gửi báo cáo ${kind}` });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

export default router;
