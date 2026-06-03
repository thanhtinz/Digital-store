/**
 * Notifications / Email Routes
 * Cấu hình SMTP để gửi email đơn hàng, đặt lại mật khẩu, thông báo.
 *
 * (Tính năng bot Telegram/Discord đã được loại bỏ.)
 * Đường dẫn giữ '/admin/bot-config' để tương thích frontend hiện có.
 */

import { Router, Request, Response } from 'express';
import nodemailer from 'nodemailer';
import prisma from '../db';
import { requireAdmin } from '../middleware/auth';
import { sendTestMail } from '../services/mail';
import { getDiscordConfig, sendToWebhook } from '../services/discord';

const router = Router();

const SMTP_KEYS = ['smtp_server', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from'];

/** Lấy cấu hình email hiện tại */
router.get('/bot-config/settings', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const configs = await prisma.siteConfig.findMany({ where: { key: { in: SMTP_KEYS } } });
    const map: Record<string, string> = Object.fromEntries(
      configs.map((c: { key: string; value: string | null }) => [c.key, c.value || ''])
    );
    res.json({
      smtp_server: map['smtp_server'] || '',
      smtp_port: map['smtp_port'] || '587',
      smtp_user: map['smtp_user'] || '',
      // Không trả mật khẩu thật — chỉ báo đã cấu hình hay chưa
      smtp_pass: map['smtp_pass'] ? '••••••••' : '',
      smtp_from: map['smtp_from'] || '',
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

/** Lưu cấu hình email */
router.put('/bot-config/settings', requireAdmin, async (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, string>;
    const updates: Array<{ key: string; value: string }> = [];
    for (const key of SMTP_KEYS) {
      if (body[key] === undefined) continue;
      // Bỏ qua mật khẩu placeholder (giữ giá trị cũ)
      if (key === 'smtp_pass' && (body[key] === '' || body[key] === '••••••••')) continue;
      updates.push({ key, value: body[key] });
    }
    await Promise.all(
      updates.map((u) =>
        prisma.siteConfig.upsert({ where: { key: u.key }, update: { value: u.value }, create: { key: u.key, value: u.value } })
      )
    );
    res.json({ message: 'Đã lưu cấu hình email' });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

/** Gửi mail test — dùng mail service (hỗ trợ direct/relay theo domain) */
router.post('/bot-config/test-mail', requireAdmin, async (req: Request, res: Response) => {
  const { to_email } = req.body;
  if (!to_email) { res.status(422).json({ detail: 'Thiếu email nhận' }); return; }
  const result = await sendTestMail(to_email);
  if (result.ok) res.json({ message: `Đã gửi mail test tới ${to_email}` });
  else res.status(400).json({ detail: `Gửi mail thất bại: ${result.error}` });
});

// ── Discord webhook ────────────────────────────────────
/** Trạng thái kênh thông báo công khai (cho frontend). */
router.get('/bot-config/public', async (_req: Request, res: Response) => {
  const cfgs = await prisma.siteConfig.findMany({ where: { key: { in: ['smtp_server', 'discord_enabled'] } } });
  const map: Record<string, string> = Object.fromEntries(cfgs.map((c: any) => [c.key, c.value || '']));
  res.json({ mail_enabled: !!map.smtp_server, discord_enabled: map.discord_enabled === 'true' });
});

/** Lấy cấu hình Discord (ẩn URL thật). */
router.get('/bot-config/discord', requireAdmin, async (_req: Request, res: Response) => {
  const { url, enabled } = await getDiscordConfig();
  res.json({ discord_webhook_url: url ? '••••••••' : '', has_webhook: !!url, discord_enabled: enabled });
});

/** Lưu cấu hình Discord. */
router.put('/bot-config/discord', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { discord_webhook_url, discord_enabled } = req.body;
    const updates: Array<{ key: string; value: string }> = [
      { key: 'discord_enabled', value: discord_enabled ? 'true' : 'false' },
    ];
    // Bỏ qua URL placeholder (giữ giá trị cũ).
    if (discord_webhook_url !== undefined && discord_webhook_url && discord_webhook_url !== '••••••••') {
      updates.push({ key: 'discord_webhook_url', value: discord_webhook_url });
    }
    await Promise.all(
      updates.map((u) =>
        prisma.siteConfig.upsert({ where: { key: u.key }, update: { value: u.value }, create: { key: u.key, value: u.value } })
      )
    );
    res.json({ message: 'Đã lưu cấu hình Discord' });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

/** Gửi thử Discord. Dùng URL truyền lên, nếu là placeholder thì lấy URL đã lưu. */
router.post('/bot-config/test-discord', requireAdmin, async (req: Request, res: Response) => {
  const input = String(req.body.discord_webhook_url || '');
  const url = input && input !== '••••••••' ? input : (await getDiscordConfig()).url;
  if (!url) { res.status(422).json({ detail: 'Chưa cấu hình webhook URL' }); return; }
  const result = await sendToWebhook(url, '✅ Tin nhắn test từ Digital Store.');
  if (result.ok) res.json({ message: 'Đã gửi tin nhắn test tới Discord' });
  else res.status(400).json({ detail: `Gửi thất bại: ${result.error}` });
});

export default router;
