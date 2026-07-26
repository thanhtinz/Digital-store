import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';
import { rateLimit } from '@/lib/rateLimit';
import { getBotUsername } from '@/lib/telegram';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

// GET — current Telegram link status for the account page.
export const GET = handler(async () => {
  const user = await requireUser();
  const s = await getSettings(['telegram_bot_token']);
  return NextResponse.json({
    available: !!s.telegram_bot_token,
    linked: !!user.telegramChatId,
    channel: user.notifyChannel,
  });
});

// POST — start linking: returns a t.me deep link with a one-time code.
export const POST = handler(async () => {
  const user = await requireUser();
  rateLimit('tg-link', 10, 60 * 60, String(user.id));
  const username = await getBotUsername();
  if (!username) return jsonError(400, 'Telegram is not configured on this store yet');

  const code = crypto.randomBytes(16).toString('hex');
  await prisma.user.update({ where: { id: user.id }, data: { telegramLinkCode: code } });
  return NextResponse.json({ ok: true, url: `https://t.me/${username}?start=${code}`, botUsername: username });
});

// PATCH { channel } — choose where notifications go.
export const PATCH = handler(async (req: NextRequest) => {
  const user = await requireUser();
  const channel = String((await req.json()).channel || '');
  if (!['email', 'telegram', 'both'].includes(channel)) return jsonError(400, 'Invalid channel');
  if (channel !== 'email' && !user.telegramChatId) {
    return jsonError(400, 'Connect your Telegram first');
  }
  await prisma.user.update({ where: { id: user.id }, data: { notifyChannel: channel } });
  return NextResponse.json({ ok: true, channel });
});

// DELETE — unlink Telegram and fall back to email notifications.
export const DELETE = handler(async () => {
  const user = await requireUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { telegramChatId: null, telegramLinkCode: null, notifyChannel: 'email' },
  });
  return NextResponse.json({ ok: true });
});
