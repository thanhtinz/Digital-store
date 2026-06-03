/**
 * Discord integration — gửi thông báo qua webhook.
 * Cấu hình lưu ở siteConfig: discord_webhook_url, discord_enabled.
 */
import axios from 'axios';
import prisma from '../db';

export async function getDiscordConfig(): Promise<{ url: string; enabled: boolean }> {
  const rows = await prisma.siteConfig.findMany({
    where: { key: { in: ['discord_webhook_url', 'discord_enabled'] } },
  });
  const map: Record<string, string> = Object.fromEntries(rows.map((r: any) => [r.key, r.value || '']));
  return { url: map.discord_webhook_url || '', enabled: map.discord_enabled === 'true' };
}

/** Gửi 1 webhook tới URL cụ thể (dùng cho test). */
export async function sendToWebhook(url: string, content: string): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!url) return { ok: false, error: 'Chưa cấu hình webhook URL' };
    await axios.post(url, { content }, { timeout: 10000 });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.response?.data?.message || e.message };
  }
}

/** Gửi thông báo Discord nếu đã bật (không ném lỗi). */
export async function notifyDiscord(content: string): Promise<void> {
  try {
    const { url, enabled } = await getDiscordConfig();
    if (!enabled || !url) return;
    await sendToWebhook(url, content);
  } catch {
    /* bỏ qua lỗi gửi Discord */
  }
}
