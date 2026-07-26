'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/components/Providers';
import { api } from '@/lib/client';
import Icon from '@/components/icons';

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyInner />
    </Suspense>
  );
}

function VerifyInner() {
  const params = useSearchParams();
  const { refreshUser } = useStore();
  const token = params.get('token') || '';
  const [state, setState] = useState<'working' | 'ok' | 'error'>('working');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('Missing verification token.');
      return;
    }
    api('/api/auth/verify-email', { method: 'POST', json: { token } })
      .then(async () => {
        await refreshUser();
        setState('ok');
      })
      .catch((e) => {
        setState('error');
        setMessage(e.message);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="container flex justify-center py-16">
      <div className="card w-full max-w-md p-8 text-center">
        {state === 'working' && (
          <>
            <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
            <p className="mt-4 text-sm text-gray-500">Verifying your email…</p>
          </>
        )}
        {state === 'ok' && (
          <>
            <Icon name="check" size={56} className="mx-auto rounded-full bg-green-100 p-3 text-green-600" />
            <h1 className="mt-4 text-xl font-bold">Email verified!</h1>
            <p className="mt-2 text-sm text-gray-500">Your account is active and you&apos;re signed in.</p>
            <Link href="/products" className="btn-primary mt-6 inline-flex">Start shopping</Link>
          </>
        )}
        {state === 'error' && (
          <>
            <Icon name="x" size={56} className="mx-auto rounded-full bg-red-100 p-3 text-red-500" />
            <h1 className="mt-4 text-xl font-bold">Verification failed</h1>
            <p className="mt-2 text-sm text-gray-500">{message}</p>
            <Link href="/login" className="btn-secondary mt-6 inline-flex">Back to sign in</Link>
          </>
        )}
      </div>
    </div>
  );
}
