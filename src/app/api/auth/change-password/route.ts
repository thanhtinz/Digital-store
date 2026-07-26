import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireUser, verifyPassword, hashPassword } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const POST = handler(async (req: NextRequest) => {
  const user = await requireUser();
  const { currentPassword, newPassword } = await req.json();

  if (String(newPassword || '').length < 8) return jsonError(400, 'New password must be at least 8 characters');
  // Users created via Google login may not have a password yet.
  if (user.passwordHash && !verifyPassword(String(currentPassword || ''), user.passwordHash)) {
    return jsonError(401, 'Current password is incorrect');
  }

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(String(newPassword)) } });
  return NextResponse.json({ ok: true });
});
