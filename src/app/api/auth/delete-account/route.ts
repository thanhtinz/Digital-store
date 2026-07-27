import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';
import { rateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

// POST { password?, confirm } — GDPR account deletion. Personal data is
// removed or anonymized; orders stay (anonymized) for legal bookkeeping.
export const POST = handler(async (req: NextRequest) => {
  const user = await requireUser();
  rateLimit('delete-account', 3, 60 * 60, String(user.id));
  const b = await req.json();

  if (String(b.confirm || '').trim().toUpperCase() !== 'DELETE') {
    return jsonError(400, 'Type DELETE to confirm');
  }
  if (user.role !== 'CUSTOMER') return jsonError(400, 'Admin accounts cannot self-delete');
  if (user.passwordHash) {
    const ok = await bcrypt.compare(String(b.password || ''), user.passwordHash);
    if (!ok) return jsonError(400, 'Incorrect password');
  }

  await prisma.$transaction([
    // Hard-delete purely personal data.
    prisma.cartItem.deleteMany({ where: { userId: user.id } }),
    prisma.wishlistItem.deleteMany({ where: { userId: user.id } }),
    prisma.authToken.deleteMany({ where: { userId: user.id } }),
    prisma.loginHistory.deleteMany({ where: { userId: user.id } }),
    prisma.stockAlert.deleteMany({ where: { userId: user.id } }),
    prisma.apiKey.deleteMany({ where: { userId: user.id } }),
    // Anonymize the account shell so orders/reviews keep a valid owner row.
    prisma.user.update({
      where: { id: user.id },
      data: {
        email: `deleted-${user.id}@deleted.invalid`,
        name: 'Deleted user',
        passwordHash: null,
        googleId: null,
        avatarUrl: null,
        twoFactorSecret: null,
        twoFactorEnabled: false,
        isBlocked: true,
        sessionVersion: { increment: 1 }, // kills every active session
        refCode: null,
        telegramChatId: null,
        telegramLinkCode: null,
        notifyChannel: 'email',
      },
    }),
  ]);

  const res = NextResponse.json({ ok: true });
  res.cookies.set('ds_session', '', { path: '/', maxAge: 0 });
  return res;
});
