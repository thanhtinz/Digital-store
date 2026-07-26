import { NextResponse } from 'next/server';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import prisma from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handler } from '@/lib/api';
import { getSetting } from '@/lib/settings';

export const dynamic = 'force-dynamic';

// Generates a new TOTP secret + QR code. The secret is stored but 2FA stays
// disabled until the user confirms a valid code via /api/auth/2fa/enable.
export const POST = handler(async () => {
  const user = await requireUser();
  const siteName = await getSetting('site_name');
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(user.email, siteName, secret);
  const qrDataUrl = await QRCode.toDataURL(otpauth, { margin: 1, width: 240 });

  await prisma.user.update({ where: { id: user.id }, data: { twoFactorSecret: secret, twoFactorEnabled: false } });
  return NextResponse.json({ secret, otpauth, qrDataUrl });
});
