import { NextRequest, NextResponse } from 'next/server';
import { authenticator } from 'otplib';
import prisma from '@/lib/db';
import { requireUser, verifyPassword } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';

export const dynamic = 'force-dynamic';

// Disabling 2FA requires the current password (or a valid TOTP code for
// passwordless Google accounts).
export const POST = handler(async (req: NextRequest) => {
  const user = await requireUser();
  const { password, code } = await req.json();

  const passwordOk = user.passwordHash && verifyPassword(String(password || ''), user.passwordHash);
  const codeOk = user.twoFactorSecret &&
    authenticator.verify({ token: String(code || '').replace(/\s/g, ''), secret: user.twoFactorSecret });
  if (!passwordOk && !codeOk) return jsonError(401, 'Confirm with your password or a valid authentication code');

  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  });
  return NextResponse.json({ ok: true });
});
