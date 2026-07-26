import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
      twoFactorEnabled: user.twoFactorEnabled,
      emailVerified: !!user.emailVerifiedAt,
      hasPassword: !!user.passwordHash,
    },
  });
}
