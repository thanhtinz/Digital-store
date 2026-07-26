'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/components/Providers';
import { api } from '@/lib/client';
import Icon from '@/components/icons';

export default function RegisterPage() {
  const router = useRouter();
  const { refreshUser, toast } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const d = await api<{ requiresVerification: boolean }>('/api/auth/register', {
        method: 'POST',
        json: { name, email, password },
      });
      if (d.requiresVerification) {
        setSent(true);
      } else {
        await refreshUser();
        router.push('/');
        router.refresh();
      }
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="container flex justify-center py-12">
        <div className="card w-full max-w-md p-8 text-center">
          <Icon name="mail" size={56} className="mx-auto text-brand-500" />
          <h1 className="mt-4 text-xl font-bold">Check your inbox</h1>
          <p className="mt-2 text-sm text-gray-500">
            We sent a verification link to <b>{email}</b>. Click it to activate your account.
          </p>
          <Link href="/login" className="btn-secondary mt-6 inline-flex">Back to sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container flex justify-center py-12">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_8px_20px_-8px_rgba(79,70,229,.6)]">
          <Icon name="spark" size={22} />
        </div>
        <h1 className="mt-4 text-center text-2xl font-bold">Create your account</h1>
        <p className="mt-1 text-sm text-gray-500">Track orders, get instant delivery and exclusive deals.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="label">Full name</label>
            <input className="input" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            <p className="mt-1 text-xs text-gray-400">At least 8 characters.</p>
          </div>
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-gray-500">
          Already have an account? <Link href="/login" className="font-semibold text-brand-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
