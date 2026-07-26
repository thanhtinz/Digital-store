import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireAdmin } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';
import { audit } from '@/lib/audit';
import { getSettings, setSettings, getAppUrl } from '@/lib/settings';
import { setTelegramWebhook, getTelegramWebhookInfo, getBotUsername } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

// GET — current webhook registration status.
export const GET = handler(async () => {
  await requireAdmin();
  const info = await getTelegramWebhookInfo();
  const username = await getBotUsername();
  return NextResponse.json({ info, botUsername: username });
});

// POST — (re)register the bot webhook against this store's public URL.
export const POST = handler(async () => {
  const admin = await requireAdmin();
  const s = await getSettings(['telegram_bot_token', 'telegram_webhook_secret']);
  if (!s.telegram_bot_token) return jsonError(400, 'Save your bot token first');

  const secret = s.telegram_webhook_secret || crypto.randomBytes(24).toString('hex');
  if (!s.telegram_webhook_secret) await setSettings({ telegram_webhook_secret: secret });

  const url = `${await getAppUrl()}/api/telegram/webhook`;
  const res = await setTelegramWebhook(url, secret);
  if (!res.ok) return jsonError(400, `Telegram refused the webhook: ${res.description || 'unknown error'}`);

  audit(admin, 'telegram.webhook', url);
  return NextResponse.json({ ok: true, url });
});
