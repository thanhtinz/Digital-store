'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore, useMoney } from '@/components/Providers';
import Link from 'next/link';
import { api } from '@/lib/client';
import Icon from '@/components/icons';

type LoginRow = { id: number; ip: string | null; userAgent: string | null; method: string; success: boolean; createdAt: string };

type Overview = { orders: number; totalSpent: number; wishlist: number; tickets: number; memberSince: string };

export default function AccountPage() {
  const { user, refreshUser, toast } = useStore();
  const money = useMoney();
  const router = useRouter();
  const [tab, setTab] = useState<'profile' | 'security' | 'logins'>('profile');
  const [overview, setOverview] = useState<Overview | null>(null);

  useEffect(() => {
    if (user === null) router.replace('/login?next=/account');
    if (user) api<Overview>('/api/account/overview').then(setOverview).catch(() => {});
  }, [user, router]);

  if (!user) return <div className="container py-16 text-center text-gray-400">Loading…</div>;

  return (
    <div className="container max-w-4xl py-8">
      {/* Profile header card */}
      <div className="card overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-brand-600 via-brand-500 to-purple-500" />
        <div className="px-6 pb-5">
          <div className="-mt-8 flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-end gap-4">
              <span className="grid h-20 w-20 place-items-center overflow-hidden rounded-2xl border-4 border-white bg-brand-100 text-2xl font-bold text-brand-700 shadow">
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </span>
              <div className="pb-1">
                <h1 className="text-xl font-bold">{user.name}</h1>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 pb-1">
              {user.emailVerified && (
                <span className="badge gap-1 bg-green-100 text-green-700"><Icon name="check" size={11} /> Verified</span>
              )}
              <span className={`badge gap-1 ${user.twoFactorEnabled ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500'}`}>
                <Icon name="shield" size={11} /> {user.twoFactorEnabled ? '2FA on' : '2FA off'}
              </span>
              {overview && (
                <span className="badge bg-gray-100 text-gray-500">
                  Member since {new Date(overview.memberSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>

          {/* Stat tiles */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {([
              ['box', overview ? String(overview.orders) : '—', 'Orders', '/orders'],
              ['credit-card', overview ? money(overview.totalSpent) : '—', 'Total spent', '/orders'],
              ['heart', overview ? String(overview.wishlist) : '—', 'Wishlist', '/wishlist'],
              ['chat', overview ? String(overview.tickets) : '—', 'Tickets', '/support'],
            ] as const).map(([icon, value, label, href]) => (
              <Link key={label} href={href} className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 transition hover:bg-brand-50">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-brand-600 shadow-sm">
                  <Icon name={icon} size={17} />
                </span>
                <span>
                  <span className="block text-base font-extrabold leading-tight">{value}</span>
                  <span className="block text-xs text-gray-500">{label}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-2 border-b border-gray-200">
        {([['profile', 'Profile'], ['security', 'Security'], ['logins', 'Login history']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-semibold ${tab === key ? 'border-b-2 border-brand-600 text-brand-700' : 'text-gray-500'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'profile' && <ProfileEditor initialName={user.name} initialAvatar={user.avatarUrl || ''} onSaved={refreshUser} />}
      {tab === 'security' && (
        <div className="mt-6 space-y-6">
          <ChangePassword hasPassword={user.hasPassword} />
          <TwoFactor enabled={user.twoFactorEnabled} hasPassword={user.hasPassword} onChanged={refreshUser} toast={toast} />
          <TelegramLink toast={toast} />
          {user.role === 'CUSTOMER' && <DeleteAccount hasPassword={user.hasPassword} />}
        </div>
      )}
      {tab === 'logins' && <LoginHistory />}
    </div>
  );
}

// GDPR: permanent account deletion with anonymized order history.
function DeleteAccount({ hasPassword }: { hasPassword: boolean }) {
  const { toast, refreshUser } = useStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await api('/api/auth/delete-account', { method: 'POST', json: { password, confirm } });
      toast('Your account has been deleted');
      await refreshUser();
      router.push('/');
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card border-red-100 p-5">
      <h2 className="font-bold text-red-600">Delete account</h2>
      <p className="mt-1 text-sm text-gray-500">
        Permanently removes your personal data (profile, cart, wishlist, sessions, Telegram link). Order records
        are kept anonymized for legal bookkeeping. This cannot be undone — any remaining wallet balance and
        loyalty points are lost.
      </p>
      {!open ? (
        <button className="btn-danger mt-4" onClick={() => setOpen(true)}>Delete my account</button>
      ) : (
        <div className="mt-4 max-w-md space-y-3 rounded-xl bg-red-50 p-4">
          {hasPassword && (
            <div>
              <label className="label">Your password</label>
              <input className="input bg-white" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          )}
          <div>
            <label className="label">Type DELETE to confirm</label>
            <input className="input bg-white" placeholder="DELETE" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button className="btn-danger" onClick={submit} disabled={busy || confirm.trim().toUpperCase() !== 'DELETE'}>
              {busy ? 'Deleting…' : 'Permanently delete'}
            </button>
            <button className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Connect a Telegram chat and pick where notifications are delivered.
function TelegramLink({ toast }: { toast: (m: string, k?: 'success' | 'error') => void }) {
  const [state, setState] = useState<{ available: boolean; linked: boolean; channel: string } | null>(null);
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [botUsername, setBotUsername] = useState('');

  const load = () => api<{ available: boolean; linked: boolean; channel: string }>('/api/telegram/link').then(setState);
  useEffect(() => { load().catch(() => {}); }, []);

  // While a link is pending, poll so the card flips to "connected" the
  // moment the user taps Start in Telegram.
  useEffect(() => {
    if (!link || state?.linked) return;
    const t = setInterval(() => load().catch(() => {}), 3000);
    return () => clearInterval(t);
  }, [link, state?.linked]);

  if (!state || !state.available) return null;

  const startLink = async () => {
    setBusy(true);
    try {
      const d = await api<{ url: string; botUsername: string }>('/api/telegram/link', { method: 'POST' });
      setLink(d.url);
      setBotUsername(d.botUsername);
      window.open(d.url, '_blank');
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const setChannel = async (channel: string) => {
    try {
      await api('/api/telegram/link', { method: 'PATCH', json: { channel } });
      setState((s) => (s ? { ...s, channel } : s));
      toast('Notification preference saved');
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  const unlink = async () => {
    if (!confirm('Disconnect Telegram? Notifications will go back to email.')) return;
    await api('/api/telegram/link', { method: 'DELETE' });
    setLink('');
    await load();
    toast('Telegram disconnected');
  };

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-bold">
          <Icon name="telegram" className="text-sky-500" /> Telegram notifications
        </h2>
        {state.linked && <span className="badge bg-green-100 text-green-700">Connected</span>}
      </div>
      <p className="mt-1 text-sm text-gray-500">
        Link your Telegram to check orders and balance from the bot, and get order updates as instant messages.
      </p>

      {!state.linked ? (
        <div className="mt-4">
          {/* Step-by-step guide */}
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">How to link — 3 steps</p>
            <ol className="mt-2 space-y-2">
              {[
                <>Press <b>Connect Telegram</b> below — a Telegram chat with our bot opens automatically.</>,
                <>In that chat, tap the <b>Start</b> button (or send the pre-filled /start message).</>,
                <>Done — this card switches to <b>Connected</b> by itself and you can pick where notifications go.</>,
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-600 text-[11px] font-bold text-white">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <p className="mt-2.5 text-xs text-gray-400">
              Works on phone and desktop — you just need the Telegram app or web.telegram.org.
            </p>
          </div>

          <button className="btn-primary mt-4" onClick={startLink} disabled={busy}>
            <Icon name="telegram" size={16} /> {busy ? 'Preparing…' : 'Connect Telegram'}
          </button>
          {link && (
            <div className="mt-3 rounded-lg bg-sky-50 p-3 text-xs text-sky-800">
              <p>
                Waiting for you to tap <b>Start</b> in the chat with{' '}
                {botUsername ? <b>@{botUsername}</b> : 'our bot'}…
              </p>
              <p className="mt-1">
                Chat didn&apos;t open?{' '}
                <a href={link} target="_blank" rel="noreferrer" className="font-semibold underline">Open it manually</a>
                {' '}— or copy this link to your phone:
              </p>
              <input
                className="input mt-1.5 bg-white py-1.5 font-mono text-[11px]"
                readOnly
                value={link}
                onFocus={(e) => e.target.select()}
              />
              <p className="mt-1.5 text-sky-600">This card updates automatically once connected.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div>
            <p className="label">Send order updates via</p>
            <div className="flex flex-wrap gap-2">
              {([['email', 'Email only'], ['telegram', 'Telegram only'], ['both', 'Email + Telegram']] as const).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setChannel(value)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold shadow-sm transition ${
                    state.channel === value ? 'bg-brand-600 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:border-brand-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-gray-400">
              Security emails (verification, password reset) always go to email.
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
            <p className="font-bold text-gray-700">Bot commands</p>
            <p className="mt-1">/orders · /order CODE · /balance · /unlink</p>
          </div>
          <button className="text-xs text-red-500 hover:underline" onClick={unlink}>Disconnect Telegram</button>
        </div>
      )}
    </div>
  );
}

function ChangePassword({ hasPassword }: { hasPassword: boolean }) {
  const { toast, refreshUser } = useStore();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) { toast('Passwords do not match', 'error'); return; }
    setBusy(true);
    try {
      await api('/api/auth/change-password', { method: 'POST', json: { currentPassword: current, newPassword: next } });
      toast('Password updated');
      setCurrent(''); setNext(''); setConfirm('');
      await refreshUser();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-5">
      <h2 className="font-bold">{hasPassword ? 'Change password' : 'Set a password'}</h2>
      {!hasPassword && (
        <p className="mt-1 text-xs text-gray-500">You signed up with Google — set a password to also sign in with email.</p>
      )}
      <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-3">
        {hasPassword && (
          <div>
            <label className="label">Current password</label>
            <input className="input" type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
          </div>
        )}
        <div>
          <label className="label">New password</label>
          <input className="input" type="password" required minLength={8} value={next} onChange={(e) => setNext(e.target.value)} />
        </div>
        <div>
          <label className="label">Confirm new password</label>
          <input className="input" type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <div className="sm:col-span-3">
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button>
        </div>
      </form>
    </div>
  );
}

function TwoFactor({ enabled, hasPassword, onChanged, toast }: {
  enabled: boolean;
  hasPassword: boolean;
  onChanged: () => Promise<void>;
  toast: (m: string, k?: 'success' | 'error') => void;
}) {
  const [setup, setSetup] = useState<{ qrDataUrl: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    try {
      const d = await api<{ qrDataUrl: string; secret: string }>('/api/auth/2fa/setup', { method: 'POST' });
      setSetup(d);
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const enable = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/api/auth/2fa/enable', { method: 'POST', json: { code } });
      toast('Two-factor authentication enabled');
      setSetup(null);
      setCode('');
      await onChanged();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const disable = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/api/auth/2fa/disable', { method: 'POST', json: { password, code } });
      toast('Two-factor authentication disabled');
      setPassword(''); setCode('');
      await onChanged();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold">Two-factor authentication (2FA)</h2>
          <p className="mt-0.5 text-xs text-gray-500">Adds a 6-digit code from an authenticator app at sign-in.</p>
        </div>
        <span className={`badge ${enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {enabled ? 'Enabled' : 'Off'}
        </span>
      </div>

      {!enabled && !setup && (
        <button className="btn-primary mt-4" onClick={start} disabled={busy}>
          {busy ? 'Preparing…' : 'Enable 2FA'}
        </button>
      )}

      {!enabled && setup && (
        <form onSubmit={enable} className="mt-4 grid items-start gap-5 sm:grid-cols-[auto_1fr]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={setup.qrDataUrl} alt="2FA QR code" className="h-40 w-40 rounded-lg border border-gray-200" />
          <div>
            <p className="text-sm">
              1. Scan the QR with Google Authenticator, 1Password, Authy…<br />
              2. Or enter the key manually: <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{setup.secret}</code><br />
              3. Enter the 6-digit code to confirm.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                className="input w-36 text-center tracking-[0.3em]"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              />
              <button className="btn-primary" disabled={busy || code.length !== 6}>Confirm</button>
            </div>
          </div>
        </form>
      )}

      {enabled && (
        <form onSubmit={disable} className="mt-4 flex flex-wrap items-end gap-3">
          {hasPassword ? (
            <div>
              <label className="label">Confirm with password</label>
              <input className="input w-56" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          ) : (
            <div>
              <label className="label">Confirm with a 2FA code</label>
              <input className="input w-36 text-center" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
            </div>
          )}
          <button className="btn-danger" disabled={busy}>Disable 2FA</button>
        </form>
      )}
    </div>
  );
}

function LoginHistory() {
  const [rows, setRows] = useState<LoginRow[] | null>(null);

  useEffect(() => {
    api<{ logins: LoginRow[] }>('/api/auth/login-history')
      .then((d) => setRows(d.logins))
      .catch(() => setRows([]));
  }, []);

  if (rows === null) return <div className="py-10 text-center text-gray-400">Loading…</div>;

  return (
    <div className="card mt-6 overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-400">
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Method</th>
            <th className="px-4 py-3">IP address</th>
            <th className="px-4 py-3">Device</th>
            <th className="px-4 py-3">Result</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-gray-100 last:border-0">
              <td className="whitespace-nowrap px-4 py-3">{new Date(r.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</td>
              <td className="px-4 py-3 capitalize">{r.method}</td>
              <td className="px-4 py-3 font-mono text-xs">{r.ip || '—'}</td>
              <td className="max-w-[220px] truncate px-4 py-3 text-xs text-gray-500">{r.userAgent || '—'}</td>
              <td className="px-4 py-3">
                <span className={`badge ${r.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {r.success ? 'Success' : 'Failed'}
                </span>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No login activity yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ProfileEditor({ initialName, initialAvatar, onSaved }: {
  initialName: string;
  initialAvatar: string;
  onSaved: () => Promise<void>;
}) {
  const { toast } = useStore();
  const [name, setName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/api/account/profile', { method: 'POST', json: { name, avatarUrl } });
      toast('Profile updated');
      await onSaved();
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card mt-6 p-5">
      <h2 className="font-bold">Profile</h2>
      <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Display name</label>
          <input className="input" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Avatar URL</label>
          <input className="input" placeholder="https://… (optional)" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
        </div>
      </form>
    </div>
  );
}
