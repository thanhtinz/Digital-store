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
  if (user && !user.emailVerifiedAt) {
    const s = await getSettings(['site_name']);
    const token = await issueToken(user.id, 'VERIFY_EMAIL', 60 * 24);
    const url = `${await getAppUrl()}/verify-email?token=${token}`;
    await sendMail(
      user.email,
      `Verify your ${s.site_name} account`,
      emailLayout(s.site_name, 'Confirm your email address',
        `<p>Hi ${user.name},</p><p>Please confirm your email address to activate your account.</p>${buttonHtml(url, 'Verify email')}`)
    );
  }
  return NextResponse.json({ ok: true });
});
