import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { consumeToken, setSessionCookie } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const POST = handler(async (req: NextRequest) => {
  const { token } = await req.json();
  const userId = await consumeToken(String(token || ''), 'VERIFY_EMAIL');
  if (!userId) return jsonError(400, 'This verification link is invalid or has expired');

  const user = await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  setSessionCookie(user);
  return NextResponse.json({ ok: true });
});
