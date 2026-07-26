import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { issueToken } from '@/lib/auth';
import { handler } from '@/lib/api';
import { getSettings, getAppUrl } from '@/lib/settings';
import { sendMail, emailLayout, buttonHtml } from '@/lib/mail';

export const dynamic = 'force-dynamic';

export const POST = handler(async (req: NextRequest) => {
  const { email } = await req.json();
  const user = await prisma.user.findUnique({ where: { email: String(email || '').trim().toLowerCase() } });
  // Always answer OK — do not reveal whether an account exists.
  if (user && user.passwordHash) {
    const s = await getSettings(['site_name']);
    const token = await issueToken(user.id, 'RESET_PASSWORD', 60);
    const url = `${await getAppUrl()}/reset-password?token=${token}`;
    await sendMail(
      user.email,
      `Reset your ${s.site_name} password`,
      emailLayout(s.site_name, 'Reset your password',
        `<p>Hi ${user.name},</p><p>We received a request to reset your password. Click the button below to choose a new one.</p>${buttonHtml(url, 'Reset password')}<p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>`)
    );
  }
  return NextResponse.json({ ok: true });
});
