import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';
import { verifyPassword, setSessionCookie, recordLogin, isAccountLocked, LOCKOUT_MESSAGE } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
import { getSettings } from '@/lib/settings';
import { sendMail, emailLayout } from '@/lib/mail';
import { handler, jsonError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const POST = handler(async (req: NextRequest) => {
  rateLimit('login', 10, 15 * 60); // 10 attempts / 15 min per IP
  const body = await req.json();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  const user = await prisma.user.findUnique({ where: { email } });
  if (user && (await isAccountLocked(user.id))) {
    return jsonError(423, LOCKOUT_MESSAGE);
  }
  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    if (user) {
      await recordLogin(user.id, 'password', false);
      // Lockout threshold just crossed → alert the account owner by email.
      if (await isAccountLocked(user.id)) {
        const s = await getSettings(['site_name']);
        sendMail(
          user.email,
          `Security alert — sign-in attempts blocked on ${s.site_name}`,
          emailLayout(s.site_name, 'Unusual sign-in activity',
            `<p>We blocked repeated failed sign-in attempts on your account. Sign-in is paused for 15 minutes.</p>
             <p>If this was you, wait and try again. If not, we recommend resetting your password and enabling two-factor authentication.</p>`)
        ).catch(() => {});
      }
    }
    return jsonError(401, 'Incorrect email or password');
  }
  if (user.isBlocked) return jsonError(403, 'This account has been suspended');
  if (!user.emailVerifiedAt) {
    return NextResponse.json({ ok: false, unverified: true, error: 'Please verify your email address first' }, { status: 403 });
  }

  if (user.twoFactorEnabled) {
    // Short-lived challenge token; session only issued after the TOTP step.
    const challenge = jwt.sign({ uid: user.id, purpose: '2fa' }, process.env.AUTH_SECRET || 'dev-only-insecure-secret', { expiresIn: '5m' });
    return NextResponse.json({ ok: true, requires2fa: true, challenge });
  }

  setSessionCookie(user);
  await recordLogin(user.id, 'password', true);
  return NextResponse.json({ ok: true });
});
