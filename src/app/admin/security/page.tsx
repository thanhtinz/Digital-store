'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import Icon from '@/components/icons';

type Row = { id: number; email?: string; name?: string; role?: string; ip: string | null; userAgent: string | null; method: string; createdAt: string };

export default function AdminSecurityPage() {
  const [data, setData] = useState<{ failedLogins: Row[]; adminLogins: Row[]; lockedUsers: any[] } | null>(null);

  useEffect(() => {
    api('/api/admin/security').then(setData).catch(() => {});
  }, []);

  if (!data) return <div className="py-16 text-center text-gray-400">Loading security overview…</div>;

  const Table = ({ rows, showRole }: { rows: Row[]; showRole?: boolean }) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-400">
            <th className="px-4 py-2.5">Account</th>
            {showRole && <th className="px-4 py-2.5">Role</th>}
            <th className="px-4 py-2.5">Method</th>
            <th className="px-4 py-2.5">IP</th>
            <th className="px-4 py-2.5">Device</th>
            <th className="px-4 py-2.5">Time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-gray-100 last:border-0">
              <td className="px-4 py-2.5">
                <p className="font-medium">{r.name || '—'}</p>
                <p className="text-xs text-gray-400">{r.email}</p>
              </td>
              {showRole && <td className="px-4 py-2.5"><span className="badge bg-gray-100 text-gray-600">{r.role}</span></td>}
              <td className="px-4 py-2.5 capitalize">{r.method}</td>
              <td className="px-4 py-2.5 font-mono text-xs">{r.ip || '—'}</td>
              <td className="max-w-[200px] truncate px-4 py-2.5 text-xs text-gray-500">{r.userAgent || '—'}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-xs text-gray-500">
                {new Date(r.createdAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={showRole ? 6 : 5} className="px-4 py-8 text-center text-gray-400">Nothing recorded.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Security</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Sign-in monitoring and active protections. Rate limiting, account lockout, session
          revocation and security headers are always on.
        </p>
      </div>

      {/* Active protections */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {([
          ['shield', 'Account lockout', '5 failed attempts → 15 min lock + email alert'],
          ['clock', 'Rate limiting', 'Login, signup and reset endpoints are throttled'],
          ['key', 'Session revocation', 'Password/2FA changes sign out all devices'],
          ['lock', 'Hardened headers', 'Clickjacking, MIME-sniff and HSTS protection'],
        ] as const).map(([icon, title, desc]) => (
          <div key={title} className="card flex items-start gap-3 p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-green-50 text-green-600">
              <Icon name={icon} size={17} />
            </span>
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-0.5 text-xs text-gray-500">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Locked accounts */}
      {data.lockedUsers.length > 0 && (
        <div className="card border-amber-200 bg-amber-50/50 p-5">
          <h2 className="flex items-center gap-2 font-bold text-amber-800">
            <Icon name="lock" size={17} /> Currently locked accounts
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-amber-800">
            {data.lockedUsers.map((u) => (
              <li key={u.id}>{u.name} — {u.email}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <h2 className="flex items-center gap-2 border-b border-gray-100 p-5 font-bold">
          <Icon name="x" size={17} className="text-red-500" /> Failed sign-ins (last 24h)
        </h2>
        <Table rows={data.failedLogins} />
      </div>

      <div className="card">
        <h2 className="flex items-center gap-2 border-b border-gray-100 p-5 font-bold">
          <Icon name="shield" size={17} className="text-brand-600" /> Recent admin & staff sign-ins
        </h2>
        <Table rows={data.adminLogins} showRole />
      </div>
    </div>
  );
}
