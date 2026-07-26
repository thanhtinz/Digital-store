'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import Icon from '@/components/icons';

type Log = {
  id: number;
  userEmail: string;
  action: string;
  target: string | null;
  detail: string | null;
  ip: string | null;
  createdAt: string;
};

// Color-code by action verb so scanning the trail is fast.
function actionColor(action: string): string {
  if (/delete|deactivate/.test(action)) return 'bg-red-100 text-red-700';
  if (/create|import/.test(action)) return 'bg-green-100 text-green-700';
  if (/deliver|markPaid|run|export/.test(action)) return 'bg-blue-100 text-blue-700';
  return 'bg-gray-100 text-gray-600';
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      api<{ logs: Log[]; total: number }>(`/api/admin/audit?page=${page}&q=${encodeURIComponent(q)}`)
        .then((d) => {
          setLogs(d.logs);
          setTotal(d.total);
          setLoaded(true);
        })
        .catch(() => {});
    }, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [page, q]);

  const pages = Math.max(1, Math.ceil(total / 30));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Audit log</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Every admin action is recorded here — who did what, when, and from which IP.
          </p>
        </div>
        <div className="relative">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input w-64 pl-9"
            placeholder="Filter by action, target, admin…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-400">
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Admin</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Detail</th>
              <th className="px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                <td className="whitespace-nowrap px-4 py-2.5 text-xs text-gray-500">
                  {new Date(l.createdAt).toLocaleString('en-US', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </td>
                <td className="max-w-[180px] truncate px-4 py-2.5">{l.userEmail}</td>
                <td className="px-4 py-2.5">
                  <span className={`badge font-mono text-[11px] ${actionColor(l.action)}`}>{l.action}</span>
                </td>
                <td className="max-w-[220px] truncate px-4 py-2.5 font-medium">{l.target || '—'}</td>
                <td className="max-w-[280px] truncate px-4 py-2.5 text-xs text-gray-500" title={l.detail || undefined}>
                  {l.detail || '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-xs text-gray-400">{l.ip || '—'}</td>
              </tr>
            ))}
            {loaded && logs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  <Icon name="list" size={36} className="mx-auto text-gray-300" />
                  <p className="mt-2">No audit entries{q ? ' matching your filter' : ' yet'}.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-gray-500">{total} entr{total === 1 ? 'y' : 'ies'}</span>
          <div className="flex gap-2">
            <button className="btn-secondary px-3 py-1.5 text-xs" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </button>
            <span className="px-2 py-1.5 text-xs text-gray-500">Page {page} / {pages}</span>
            <button className="btn-secondary px-3 py-1.5 text-xs" disabled={page >= pages} onClick={() => setPage(page + 1)}>
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
