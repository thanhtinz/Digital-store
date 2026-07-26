'use client';

import { useCallback, useEffect, useState } from 'react';
import { useStore } from '@/components/Providers';
import { api } from '@/lib/client';

export default function AdminUsersPage() {
  const { user: me, toast } = useStore();
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    const d = await api<{ users: any[]; total: number }>(`/api/admin/users?page=${page}&q=${encodeURIComponent(q)}`);
    setUsers(d.users);
    setTotal(d.total);
  }, [page, q]);

  useEffect(() => { load().catch(() => {}); }, [load]);

  const update = async (id: number, body: any) => {
    try {
      await api(`/api/admin/users/${id}`, { method: 'PATCH', json: body });
      toast('User updated');
      await load();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  const isAdmin = me?.role === 'ADMIN';

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Users <span className="text-sm font-normal text-gray-400">({total})</span></h1>
        <input className="input w-56" placeholder="Search name or email…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      </div>

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-400">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Verified</th>
              <th className="px-4 py-3">2FA</th>
              <th className="px-4 py-3">Orders</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3">
                  <p className="font-semibold">{u.name} {u.googleId && <span title="Google account">🔵</span>}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </td>
                <td className="px-4 py-3">
                  {isAdmin && u.id !== me?.id ? (
                    <select className="input w-32 py-1 text-xs" value={u.role} onChange={(e) => update(u.id, { role: e.target.value })}>
                      <option value="CUSTOMER">Customer</option>
                      <option value="STAFF">Staff</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  ) : (
                    <span className="badge bg-gray-100 text-gray-600">{u.role}</span>
                  )}
                </td>
                <td className="px-4 py-3">{u.emailVerifiedAt ? '✅' : '—'}</td>
                <td className="px-4 py-3">{u.twoFactorEnabled ? '🔐' : '—'}</td>
                <td className="px-4 py-3">{u._count.orders}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">{new Date(u.createdAt).toLocaleDateString('en-US')}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${u.isBlocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {u.isBlocked ? 'Blocked' : 'Active'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {isAdmin && u.id !== me?.id && (
                    <button
                      className={`px-3 py-1.5 text-xs font-semibold ${u.isBlocked ? 'text-green-600' : 'text-red-500'} hover:underline`}
                      onClick={() => update(u.id, { isBlocked: !u.isBlocked })}
                    >
                      {u.isBlocked ? 'Unblock' : 'Block'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">No users found.</td></tr>}
          </tbody>
        </table>
      </div>

      {total > 20 && (
        <div className="mt-4 flex justify-center gap-2">
          <button className="btn-secondary px-3 py-1.5" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
          <span className="px-3 py-1.5 text-sm text-gray-500">Page {page} / {Math.ceil(total / 20)}</span>
          <button className="btn-secondary px-3 py-1.5" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage((p) => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
