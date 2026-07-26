import { NextRequest, NextResponse } from 'next/server';
import { authenticator } from 'otplib';
import prisma from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const POST = handler(async (req: NextRequest) => {
  const user = await requireUser();
  const { code } = await req.json();
  if (!user.twoFactorSecret) return jsonError(400, 'Run 2FA setup first');

  if (!authenticator.verify({ token: String(code || '').replace(/\s/g, ''), secret: user.twoFactorSecret })) {
    return jsonError(400, 'Incorrect authentication code — check your authenticator app');
  }
  await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true } });
  return NextResponse.json({ ok: true });
});
