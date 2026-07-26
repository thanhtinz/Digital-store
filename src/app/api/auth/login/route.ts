import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';
import { verifyPassword, setSessionCookie, recordLogin } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const POST = handler(async (req: NextRequest) => {
  const body = await req.json();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    if (user) await recordLogin(user.id, 'password', false);
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
