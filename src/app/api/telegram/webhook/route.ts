import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { sendTelegramTo, escapeHtml } from '@/lib/telegram';
import { formatMoney } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Awaiting payment',
  PAID: 'Awaiting delivery',
  COMPLETED: 'Delivered',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

const HELP = [
  '<b>Commands</b>',
  '/orders — your 5 latest orders',
  '/order CODE — details of one order',
  '/balance — wallet balance and loyalty points',
  '/unlink — disconnect this Telegram from your account',
  '/help — this list',
].join('\n');

// Telegram webhook — receives customer messages for the store bot.
export async function POST(req: NextRequest) {
  // Telegram echoes the secret we registered with setWebhook.
  const s = await getSettings(['telegram_webhook_secret']);
  if (!s.telegram_webhook_secret || req.headers.get('x-telegram-bot-api-secret-token') !== s.telegram_webhook_secret) {
    return NextResponse.json({ ok: true }); // never reveal anything to probes
  }

  const update = await req.json().catch(() => null);
  const msg = update?.message;
  const chatId = msg?.chat?.id ? String(msg.chat.id) : null;
  const text = String(msg?.text || '').trim();
  if (!chatId || !text) return NextResponse.json({ ok: true });

  const reply = (t: string) => sendTelegramTo(chatId, t).catch(() => {});
  const user = await prisma.user.findUnique({ where: { telegramChatId: chatId } });

  // ── /start <code> — finish the account link ──
  if (text.startsWith('/start')) {
    const code = text.split(/\s+/)[1];
    if (code) {
      const pending = await prisma.user.findUnique({ where: { telegramLinkCode: code } });
      if (pending) {
        // A chat can only be attached to one account at a time.
        await prisma.user.updateMany({ where: { telegramChatId: chatId }, data: { telegramChatId: null } });
        await prisma.user.update({
          where: { id: pending.id },
          data: { telegramChatId: chatId, telegramLinkCode: null, notifyChannel: pending.notifyChannel === 'email' ? 'both' : pending.notifyChannel },
        });
        await reply(
          `Connected! This chat is now linked to <b>${escapeHtml(pending.email)}</b>.\n` +
          `Order updates will arrive here.\n\n${HELP}`
        );
        return NextResponse.json({ ok: true });
      }
      await reply('That link code is invalid or expired. Generate a fresh one from Account & security on the website.');
      return NextResponse.json({ ok: true });
    }
    await reply(
      user
        ? `You are linked as <b>${escapeHtml(user.email)}</b>.\n\n${HELP}`
        : 'Welcome! To link your store account, open the website → Account & security → Connect Telegram, then tap the link it gives you.'
    );
    return NextResponse.json({ ok: true });
  }

  if (!user) {
    await reply('This chat is not linked to a store account yet. Open the website → Account & security → Connect Telegram.');
    return NextResponse.json({ ok: true });
  }

  // ── Linked-user commands ──
  if (text.startsWith('/orders')) {
    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { id: 'desc' },
      take: 5,
      select: { code: true, status: true, total: true, createdAt: true },
    });
    if (!orders.length) {
      await reply('No orders yet.');
    } else {
      const lines = orders.map((o) =>
        `<b>${o.code}</b> · ${formatMoney(Number(o.total))} · ${STATUS_LABEL[o.status] || o.status}`
      );
      await reply(`<b>Your latest orders</b>\n${lines.join('\n')}\n\nUse /order CODE for details.`);
    }
  } else if (text.startsWith('/order')) {
    const code = (text.split(/\s+/)[1] || '').toUpperCase();
    if (!code) {
      await reply('Usage: /order CODE — e.g. /order AB12CD34EF');
    } else {
      const order = await prisma.order.findFirst({
        where: { code, userId: user.id },
        include: { items: true },
      });
      if (!order) {
        await reply(`Order ${escapeHtml(code)} was not found on your account.`);
      } else {
        const items = order.items
          .map((i) => `• ${escapeHtml(`${i.productName} — ${i.packageName}`)} ×${i.quantity}`)
          .join('\n');
        const delivered = order.items.filter((i) => i.deliveryData);
        const deliveredBlock = delivered.length
          ? `\n\n<b>Delivered items</b>\n${delivered.map((i) => `<b>${escapeHtml(`${i.productName} — ${i.packageName}`)}</b>\n<code>${escapeHtml(i.deliveryData!)}</code>`).join('\n')}`
          : '';
        await reply(
          `<b>Order ${order.code}</b> — ${STATUS_LABEL[order.status] || order.status}\n` +
          `${items}\nTotal: ${formatMoney(Number(order.total))}${deliveredBlock}`
        );
      }
    }
  } else if (text.startsWith('/balance')) {
    await reply(
      `<b>Wallet balance:</b> ${formatMoney(Number(user.balance))}\n` +
      `<b>Loyalty points:</b> ${user.loyaltyPoints}`
    );
  } else if (text.startsWith('/unlink')) {
    await prisma.user.update({
      where: { id: user.id },
      data: { telegramChatId: null, notifyChannel: 'email' },
    });
    await reply('Disconnected. Notifications will go to your email again. You can re-link any time from the website.');
  } else {
    await reply(HELP);
  }

  return NextResponse.json({ ok: true });
}
