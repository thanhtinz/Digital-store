import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { consumeToken, hashPassword, setSessionCookie, bumpSessionVersion } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const POST = handler(async (req: NextRequest) => {
  const { token, password } = await req.json();
  if (String(password || '').length < 8) return jsonError(400, 'Password must be at least 8 characters');

  const userId = await consumeToken(String(token || ''), 'RESET_PASSWORD');
  if (!userId) return jsonError(400, 'This reset link is invalid or has expired');

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hashPassword(String(password)), emailVerifiedAt: new Date() },
  });
  // Revoke all existing sessions, then sign this browser in fresh.
  const user = await bumpSessionVersion(userId);
  setSessionCookie(user);
  return NextResponse.json({ ok: true });
});
