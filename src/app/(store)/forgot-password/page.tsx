'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client';
import Icon from '@/components/icons';
import { useT } from '@/components/Providers';

export default function ForgotPasswordPage() {
  const t = useT();
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
            <Icon name="mail" size={56} className="mx-auto text-brand-500" />
            <h1 className="mt-4 text-xl font-bold">{t('auth.checkInbox')}</h1>
            <p className="mt-2 text-sm text-gray-500">{t('auth.resetSent', { email })}</p>
            <Link href="/login" className="btn-secondary mt-6 inline-flex">{t('auth.backToSignIn')}</Link>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold">{t('auth.forgotTitle')}</h1>
            <p className="mt-1 text-sm text-gray-500">{t('auth.forgotSub')}</p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <input className="input" type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              <button className="btn-primary w-full" disabled={busy}>{busy ? t('auth.sending') : t('auth.sendResetLink')}</button>
            </form>
            <p className="mt-5 text-center text-sm">
              <Link href="/login" className="text-gray-500 hover:underline">← {t('auth.backToSignIn')}</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
