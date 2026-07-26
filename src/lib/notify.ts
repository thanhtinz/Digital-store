import prisma from './db';
import { sendMail } from './mail';
import { sendTelegramTo } from './telegram';

// Delivers an account notification through the channel the user picked
// (email / telegram / both). Falls back to email when a Telegram send
// fails so nothing important is ever lost. Security emails (verification,
// password reset) must NOT go through here — they are always email.
export async function notifyUser(
  userId: number,
  message: { subject: string; html: string; text: string }
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, notifyChannel: true, telegramChatId: true },
  });
  if (!user) return;

  const wantsTelegram = (user.notifyChannel === 'telegram' || user.notifyChannel === 'both') && !!user.telegramChatId;
  const wantsEmail = user.notifyChannel === 'email' || user.notifyChannel === 'both' || !wantsTelegram;

  let telegramOk = false;
  if (wantsTelegram) {
    telegramOk = await sendTelegramTo(user.telegramChatId!, message.text).catch(() => false);
  }
  if (wantsEmail || (wantsTelegram && !telegramOk && user.notifyChannel === 'telegram')) {
    await sendMail(user.email, message.subject, message.html).catch(() => {});
  }
}
