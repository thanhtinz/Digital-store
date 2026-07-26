import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { consumeToken, setSessionCookie } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';
import { getSettings, getAppUrl } from '@/lib/settings';
import { sendMail, emailLayout, buttonHtml } from '@/lib/mail';

export const dynamic = 'force-dynamic';

export const POST = handler(async (req: NextRequest) => {
  const { token } = await req.json();
  const userId = await consumeToken(String(token || ''), 'VERIFY_EMAIL');
  if (!userId) return jsonError(400, 'This verification link is invalid or has expired');

  const user = await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  setSessionCookie(user);

  // Automatic welcome email once the account is active.
  const s = await getSettings(['site_name']);
  const appUrl = await getAppUrl();
  sendMail(
    user.email,
    `Welcome to ${s.site_name}!`,
    emailLayout(s.site_name, `Welcome aboard, ${user.name}!`,
      `<p>Your account is verified and ready. Every purchase is delivered digitally — most orders arrive seconds after payment.</p>
       ${buttonHtml(`${appUrl}/products`, 'Start shopping')}
       <p>Tip: secure your account with two-factor authentication under <b>Account &amp; security</b>.</p>`)
  ).catch(() => {});

  return NextResponse.json({ ok: true });
});
