import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hashPassword, issueToken, setSessionCookie } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';
import { isValidEmail } from '@/lib/utils';
import { getSettings, getAppUrl } from '@/lib/settings';
import { sendMail, emailLayout, buttonHtml } from '@/lib/mail';

export const dynamic = 'force-dynamic';

export const POST = handler(async (req: NextRequest) => {
  const body = await req.json();
  const email = String(body.email || '').trim().toLowerCase();
  const name = String(body.name || '').trim().slice(0, 120);
  const password = String(body.password || '');

  if (!isValidEmail(email)) return jsonError(400, 'Please enter a valid email address');
  if (!name) return jsonError(400, 'Please enter your name');
  if (password.length < 8) return jsonError(400, 'Password must be at least 8 characters');

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return jsonError(409, 'An account with this email already exists');

  const s = await getSettings(['require_email_verification', 'site_name']);
  const requireVerify = s.require_email_verification === 'true';

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash: hashPassword(password),
      emailVerifiedAt: requireVerify ? null : new Date(),
    },
  });

  if (requireVerify) {
    const token = await issueToken(user.id, 'VERIFY_EMAIL', 60 * 24);
    const url = `${await getAppUrl()}/verify-email?token=${token}`;
    await sendMail(
      email,
      `Verify your ${s.site_name} account`,
      emailLayout(s.site_name, 'Confirm your email address',
        `<p>Hi ${name},</p><p>Welcome to ${s.site_name}! Please confirm your email address to activate your account.</p>${buttonHtml(url, 'Verify email')}<p>This link expires in 24 hours.</p>`)
    );
    return NextResponse.json({ ok: true, requiresVerification: true });
  }

  setSessionCookie(user);
  return NextResponse.json({ ok: true, requiresVerification: false });
});
