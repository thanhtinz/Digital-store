'use client';

import { useCallback, useEffect, useState } from 'react';
import { ADMIN_INTL_LOCALE, useAdminT, useStore } from '@/components/Providers';
import { api } from '@/lib/client';
import Icon from '@/components/icons';

export default function AdminUsersPage() {
  const { user: me, toast } = useStore();
  const t = useAdminT();
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
      toast(t('admin.users.updatedToast'));
      await load();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  const isAdmin = me?.role === 'ADMIN';

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('admin.users.title')} <span className="text-sm font-normal text-gray-400">({total})</span></h1>
        <input className="input w-56" placeholder={t('admin.users.search')} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      </div>

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-400">
              <th className="px-4 py-3">{t('admin.users.colUser')}</th>
              <th className="px-4 py-3">{t('admin.users.colRole')}</th>
              <th className="px-4 py-3">{t('admin.users.colVerified')}</th>
              <th className="px-4 py-3">2FA</th>
              <th className="px-4 py-3">{t('admin.users.colOrders')}</th>
              <th className="px-4 py-3">{t('admin.users.colJoined')}</th>
              <th className="px-4 py-3">{t('admin.products.colStatus')}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3">
                  <p className="flex items-center gap-1.5 font-semibold">{u.name} {u.googleId && <span title={t('admin.users.googleAccount')} className="text-blue-600"><Icon name="google" size={14} /></span>}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </td>
                <td className="px-4 py-3">
                  {isAdmin && u.id !== me?.id ? (
                    <select className="input w-32 py-1 text-xs" value={u.role} onChange={(e) => update(u.id, { role: e.target.value })}>
                      <option value="CUSTOMER">{t('admin.users.roleCustomer')}</option>
                      <option value="STAFF">{t('admin.users.roleStaff')}</option>
                      <option value="ADMIN">{t('admin.users.roleAdmin')}</option>
                    </select>
                  ) : (
                    <span className="badge bg-gray-100 text-gray-600">{t(`admin.users.role${u.role}`)}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {u.emailVerifiedAt ? (
                    <Icon name="check" size={16} className="text-green-600" />
                  ) : isAdmin && u.id !== me?.id ? (
                    <button className="px-2 py-1 text-xs font-semibold text-brand-600 hover:underline" onClick={() => update(u.id, { verifyEmail: true })}>
                      {t('admin.users.verify')}
                    </button>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3">{u.twoFactorEnabled ? <Icon name="shield" size={16} className="text-brand-600" /> : <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-3">{u._count.orders}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">{new Date(u.createdAt).toLocaleDateString(ADMIN_INTL_LOCALE)}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${u.isBlocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {u.isBlocked ? t('admin.users.blocked') : t('admin.users.active')}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {isAdmin && u.id !== me?.id && (
                    <button
                      className={`px-3 py-1.5 text-xs font-semibold ${u.isBlocked ? 'text-green-600' : 'text-red-500'} hover:underline`}
                      onClick={() => update(u.id, { isBlocked: !u.isBlocked })}
                    >
                      {u.isBlocked ? t('admin.users.unblock') : t('admin.users.block')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">{t('admin.users.empty')}</td></tr>}
          </tbody>
        </table>
      </div>

      {total > 20 && (
        <div className="mt-4 flex justify-center gap-2">
          <button className="btn-secondary px-3 py-1.5" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><span>←</span> {t('admin.common.prev')}</button>
          <span className="px-3 py-1.5 text-sm text-gray-500">{t('admin.common.pageOf', { page, total: Math.ceil(total / 20) })}</span>
          <button className="btn-secondary px-3 py-1.5" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage((p) => p + 1)}>{t('admin.common.next')} <span>→</span></button>
        </div>
      )}
    </div>
  );
}
