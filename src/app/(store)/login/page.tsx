'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/icons';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/components/Providers';
import { api } from '@/lib/client';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { refreshUser, refreshCart, toast } = useStore();
  const next = params.get('next') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [challenge, setChallenge] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [unverified, setUnverified] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    api<{ googleLoginEnabled: boolean }>('/api/public/config')
      .then((d) => setGoogleEnabled(d.googleLoginEnabled))
      .catch(() => {});
    const err = params.get('error');
    if (err) toast(err, 'error');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = async () => {
    await refreshUser();
    await refreshCart();
    router.push(next);
    router.refresh();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setUnverified(false);
    try {
      const d = await api<{ requires2fa?: boolean; challenge?: string; unverified?: boolean }>('/api/auth/login', {
        method: 'POST',
        json: { email, password },
      });
      if (d.requires2fa && d.challenge) {
        setChallenge(d.challenge);
      } else {
        await finish();
      }
    } catch (e: any) {
      if (e.message.includes('verify your email')) setUnverified(true);
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const submit2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/api/auth/2fa/verify', { method: 'POST', json: { challenge, code } });
      await finish();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    await api('/api/auth/resend-verification', { method: 'POST', json: { email } });
    toast('Verification email sent — check your inbox');
  };

  return (
    <div className="container flex justify-center py-12">
      <div className="card w-full max-w-md p-6 sm:p-8">
        {challenge ? (
          <>
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_8px_20px_-8px_rgba(79,70,229,.6)]">
              <Icon name="shield" size={22} />
            </div>
            <h1 className="mt-4 text-center text-2xl font-bold">Two-factor authentication</h1>
            <p className="mt-1 text-center text-sm text-gray-500">Enter the 6-digit code from your authenticator app.</p>
            <form onSubmit={submit2fa} className="mt-6 space-y-4">
              <input
                className="input text-center text-2xl tracking-[0.5em]"
                inputMode="numeric"
                maxLength={6}
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              />
              <button className="btn-primary w-full" disabled={busy || code.length !== 6}>
                {busy ? 'Verifying…' : 'Verify & sign in'}
              </button>
              <button type="button" className="w-full text-center text-sm text-gray-500 hover:underline" onClick={() => setChallenge(null)}>
                ← Back to sign in
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_8px_20px_-8px_rgba(79,70,229,.6)]">
              <Icon name="user" size={22} />
            </div>
            <h1 className="mt-4 text-center text-2xl font-bold">Welcome back</h1>
            <p className="mt-1 text-center text-sm text-gray-500">Sign in to your account to continue.</p>

            {googleEnabled && (
              <>
                <a href="/api/auth/google" className="btn-secondary mt-6 w-full">
                  <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 40.4 44 35 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>
                  Continue with Google
                </a>
                <div className="my-5 flex items-center gap-3 text-xs text-gray-400">
                  <span className="h-px flex-1 bg-gray-200" />or<span className="h-px flex-1 bg-gray-200" />
                </div>
              </>
            )}

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="label">Password</label>
                  <Link href="/forgot-password" className="text-xs text-brand-600 hover:underline">Forgot password?</Link>
                </div>
                <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              {unverified && (
                <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
                  Your email isn&apos;t verified yet.{' '}
                  <button type="button" className="font-semibold underline" onClick={resend}>Resend verification email</button>
                </p>
              )}
              <button className="btn-primary w-full" disabled={busy}>
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
            <p className="mt-5 text-center text-sm text-gray-500">
              New here? <Link href="/register" className="font-semibold text-brand-600 hover:underline">Create an account</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
