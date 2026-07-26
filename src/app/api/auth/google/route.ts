import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { handler, jsonError } from '@/lib/api';
import { getSettings, getAppUrl } from '@/lib/settings';

export const dynamic = 'force-dynamic';

// Starts the Google OAuth authorization-code flow.
export const GET = handler(async () => {
  const s = await getSettings(['google_client_id', 'google_login_enabled']);
  if (s.google_login_enabled !== 'true' || !s.google_client_id) {
    return jsonError(503, 'Google login is not enabled');
  }
  const state = crypto.randomBytes(16).toString('hex');
  cookies().set('ds_oauth_state', state, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600 });

  const params = new URLSearchParams({
    client_id: s.google_client_id,
    redirect_uri: `${await getAppUrl()}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});
