'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/api/auth/forgot-password', { method: 'POST', json: { email } });
      setSent(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container flex justify-center py-12">
      <div className="card w-full max-w-md p-6 sm:p-8">
        {sent ? (
          <div className="text-center">
            <p className="text-5xl">📬</p>
            <h1 className="mt-4 text-xl font-bold">Check your inbox</h1>
            <p className="mt-2 text-sm text-gray-500">
              If an account exists for <b>{email}</b>, we sent a link to reset the password. The link expires in 1 hour.
            </p>
            <Link href="/login" className="btn-secondary mt-6 inline-flex">Back to sign in</Link>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold">Forgot your password?</h1>
            <p className="mt-1 text-sm text-gray-500">Enter your email and we&apos;ll send you a reset link.</p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <input className="input" type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              <button className="btn-primary w-full" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
            </form>
            <p className="mt-5 text-center text-sm">
              <Link href="/login" className="text-gray-500 hover:underline">← Back to sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
