import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { setSessionCookie, recordLogin } from '@/lib/auth';
import { getSettings, getAppUrl } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const appUrl = await getAppUrl();
  const fail = (reason: string) => NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent(reason)}`);

  try {
    const code = req.nextUrl.searchParams.get('code');
    const state = req.nextUrl.searchParams.get('state');
    const savedState = cookies().get('ds_oauth_state')?.value;
    cookies().set('ds_oauth_state', '', { path: '/', maxAge: 0 });
    if (!code || !state || state !== savedState) return fail('Google sign-in failed. Please try again.');

    const s = await getSettings(['google_client_id', 'google_client_secret']);
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: s.google_client_id,
        client_secret: s.google_client_secret,
        redirect_uri: `${appUrl}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });
    const tokens = await tokenRes.json();
    if (!tokenRes.ok || !tokens.access_token) return fail('Google sign-in failed. Please try again.');

    const infoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const info = await infoRes.json();
    if (!info.email) return fail('Could not read your Google profile.');

    const email = String(info.email).toLowerCase();
    let user = await prisma.user.findFirst({ where: { OR: [{ googleId: String(info.id) }, { email }] } });
    if (user?.isBlocked) return fail('This account has been suspended.');

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: String(info.name || email.split('@')[0]).slice(0, 120),
          googleId: String(info.id),
          avatarUrl: info.picture || null,
          emailVerifiedAt: new Date(), // Google has already verified the address
        },
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: String(info.id), emailVerifiedAt: user.emailVerifiedAt ?? new Date(), avatarUrl: user.avatarUrl || info.picture || null },
      });
    }

    setSessionCookie(user);
    await recordLogin(user.id, 'google', true);
    return NextResponse.redirect(appUrl);
  } catch (e) {
    console.error('Google OAuth error:', e);
    return fail('Google sign-in failed. Please try again.');
  }
}
