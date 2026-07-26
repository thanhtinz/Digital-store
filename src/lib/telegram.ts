import { getSettings } from './settings';

// Push a message to the store owner's Telegram chat. No-op unless the
// feature is enabled and configured; failures only log — notifications
// must never break the flow that triggered them.
export async function sendTelegram(text: string): Promise<boolean> {
  const s = await getSettings(['telegram_enabled', 'telegram_bot_token', 'telegram_chat_id']);
  if (s.telegram_enabled !== 'true' || !s.telegram_bot_token || !s.telegram_chat_id) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${s.telegram_bot_token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: s.telegram_chat_id,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      console.error('[telegram] send failed:', res.status, await res.text().catch(() => ''));
      return false;
    }
    return true;
  } catch (e) {
    console.error('[telegram] send failed:', e);
    return false;
  }
}

// Direct-credentials variant used by the admin "Send test" button.
export async function testTelegram(botToken: string, chatId: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: 'Test message from your store — Telegram notifications are working.' }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
