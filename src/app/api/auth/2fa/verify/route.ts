import { NextRequest, NextResponse } from 'next/server';
import { authenticator } from 'otplib';
import prisma from '@/lib/db';
import { setSessionCookie, recordLogin, verifyTwoFactorChallenge } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';
import { rateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

// Completes a 2FA login challenge issued by /api/auth/login.
export const POST = handler(async (req: NextRequest) => {
  rateLimit('2fa-verify', 10, 15 * 60);
  const body = await req.json();
  const challenge = String(body.challenge || '');
  const code = String(body.code || '').replace(/\s/g, '');

  const payload = verifyTwoFactorChallenge(challenge);
  if (!payload) return jsonError(401, 'Your login attempt expired. Please sign in again.');

  const user = await prisma.user.findUnique({ where: { id: payload.uid } });
  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) return jsonError(401, 'Invalid challenge');

  if (!authenticator.verify({ token: code, secret: user.twoFactorSecret })) {
    await recordLogin(user.id, '2fa', false);
    return jsonError(401, 'Incorrect authentication code');
  }

  setSessionCookie(user);
  await recordLogin(user.id, '2fa', true);
  return NextResponse.json({ ok: true });
});
