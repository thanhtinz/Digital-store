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

// ── Customer-facing bot helpers ──────────────────────────────────────
// These run on a SEPARATE bot (customer_bot_token) so the store's private
// admin-alert bot is never exposed to customers.

// Send to a specific chat (customer notifications and bot replies).
export async function sendTelegramTo(chatId: string, text: string): Promise<boolean> {
  const s = await getSettings(['customer_bot_token']);
  if (!s.customer_bot_token || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${s.customer_bot_token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
    if (!res.ok) console.error('[telegram] user send failed:', res.status, await res.text().catch(() => ''));
    return res.ok;
  } catch (e) {
    console.error('[telegram] user send failed:', e);
    return false;
  }
}

export async function getBotUsername(): Promise<string | null> {
  const s = await getSettings(['customer_bot_token']);
  if (!s.customer_bot_token) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${s.customer_bot_token}/getMe`);
    const data = await res.json();
    return data?.result?.username || null;
  } catch {
    return null;
  }
}

export async function setTelegramWebhook(url: string, secret: string): Promise<{ ok: boolean; description?: string }> {
  const s = await getSettings(['customer_bot_token']);
  if (!s.customer_bot_token) return { ok: false, description: 'No customer bot token saved' };
  try {
    const res = await fetch(`https://api.telegram.org/bot${s.customer_bot_token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, secret_token: secret, allowed_updates: ['message'] }),
    });
    const data = await res.json();
    return { ok: !!data?.ok, description: data?.description };
  } catch (e: any) {
    return { ok: false, description: e.message };
  }
}

export async function getTelegramWebhookInfo(): Promise<{ url?: string; lastError?: string } | null> {
  const s = await getSettings(['customer_bot_token']);
  if (!s.customer_bot_token) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${s.customer_bot_token}/getWebhookInfo`);
    const data = await res.json();
    return { url: data?.result?.url || '', lastError: data?.result?.last_error_message };
  } catch {
    return null;
  }
}
