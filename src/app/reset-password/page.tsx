'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/components/Providers';
import { api } from '@/lib/client';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetInner />
    </Suspense>
  );
}

function ResetInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { refreshUser, toast } = useStore();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast('Passwords do not match', 'error');
      return;
    }
    setBusy(true);
    try {
      await api('/api/auth/reset-password', { method: 'POST', json: { token, password } });
      await refreshUser();
      toast('Password updated — you are signed in');
      router.push('/');
      router.refresh();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container flex justify-center py-12">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <h1 className="text-xl font-bold">Choose a new password</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="label">New password</label>
            <input className="input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <label className="label">Confirm password</label>
            <input className="input" type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Saving…' : 'Set new password'}</button>
        </form>
      </div>
    </div>
  );
}
