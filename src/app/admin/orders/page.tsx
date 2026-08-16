'use client';

import { useCallback, useEffect, useState } from 'react';
import { useStore, useMoney } from '@/components/Providers';
import { api } from '@/lib/client';

import StatusBadge from '@/components/StatusBadge';

const STATUSES = ['', 'PENDING', 'PAID', 'COMPLETED', 'CANCELLED', 'REFUNDED'];

export default function AdminOrdersPage() {
  const { toast } = useStore();
  const money = useMoney();
  const [orders, setOrders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState<any | null>(null);
  const [deliverText, setDeliverText] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    const d = await api<{ orders: any[]; total: number }>(
      `/api/admin/orders?page=${page}&q=${encodeURIComponent(q)}&status=${status}`
    );
    setOrders(d.orders);
    setTotal(d.total);
  }, [page, q, status]);

  useEffect(() => { load().catch(() => {}); }, [load]);

  const action = async (orderId: number, body: any) => {
    try {
      const d = await api<{ order: any }>(`/api/admin/orders/${orderId}`, { method: 'PATCH', json: body });
      toast('Order updated');
      setOpen(d.order);
      await load();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  if (open) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold">Order #{open.code} <StatusBadge status={open.status} /></h1>
          <button className="btn-secondary" onClick={() => setOpen(null)}>← Back to orders</button>
        </div>
        <div className="card p-5 text-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div><p className="text-xs text-gray-400">Customer</p><p className="font-semibold">{open.user?.name}</p><p className="text-xs">{open.email}</p></div>
            <div><p className="text-xs text-gray-400">Total</p><p className="font-semibold">{money(Number(open.total), open.currency)}</p>
              {Number(open.discount) > 0 && <p className="text-xs text-green-600">−{money(Number(open.discount))} ({open.couponCode})</p>}</div>
            <div><p className="text-xs text-gray-400">Payment</p><p className="font-semibold capitalize">{open.paymentMethod || '—'}</p><p className="break-all text-xs text-gray-400">{open.paymentRef}</p></div>
            <div><p className="text-xs text-gray-400">Placed</p><p className="font-semibold">{new Date(open.createdAt).toLocaleString('en-US')}</p></div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {open.status === 'PENDING' && (
              <>
                <button className="btn-primary px-3 py-1.5 text-xs" onClick={() => action(open.id, { action: 'markPaid' })}>Mark paid (manual)</button>
                <button className="btn-danger px-3 py-1.5 text-xs" onClick={() => action(open.id, { action: 'cancel' })}>Cancel order</button>
              </>
            )}
            {(open.status === 'PAID' || open.status === 'COMPLETED') && (
              <button className="btn-danger px-3 py-1.5 text-xs" onClick={() => confirm('Mark as refunded? Issue the actual refund in your gateway dashboard.') && action(open.id, { action: 'refund' })}>
                Mark refunded
              </button>
            )}
          </div>
        </div>

        <div className="card divide-y divide-gray-100">
          {open.items.map((item: any) => (
            <div key={item.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{item.productName} — {item.packageName} × {item.quantity}</p>
                  {item.customFieldsData && Object.keys(item.customFieldsData).length > 0 && (
                    <p className="mt-0.5 text-xs text-brand-700">
                      Buyer info: {Object.entries(item.customFieldsData as Record<string, string>).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                    </p>
                  )}
                </div>
                <span className="text-sm font-bold">{money(Number(item.lineTotal))}</span>
              </div>
              {item.deliveryData ? (
                <pre className="mt-2 whitespace-pre-wrap break-all rounded-lg bg-gray-900 p-3 font-mono text-xs text-green-300">{item.deliveryData}</pre>
              ) : (
                <div className="mt-2 flex gap-2">
                  <textarea
                    className="input flex-1 font-mono text-xs"
                    rows={2}
                    placeholder="Delivery content (keys / credentials / instructions)…"
                    value={deliverText[item.id] || ''}
                    onChange={(e) => setDeliverText((t) => ({ ...t, [item.id]: e.target.value }))}
                  />
                  <button
                    className="btn-primary px-3 text-xs"
                    onClick={() => action(open.id, { action: 'deliver', itemId: item.id, deliveryData: deliverText[item.id] || '' })}
                    disabled={!(deliverText[item.id] || '').trim()}
                  >
                    Deliver
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Orders <span className="text-sm font-normal text-gray-400">({total})</span></h1>
        <div className="flex gap-2">
          <select className="input w-40" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            {STATUSES.map((s) => <option key={s} value={s}>{s || 'All statuses'}</option>)}
          </select>
          <input className="input w-48" placeholder="Order code or email…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
      </div>

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-400">
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs font-bold">#{o.code}</td>
                <td className="max-w-[180px] truncate px-4 py-3">{o.user?.name || o.email}</td>
                <td className="max-w-[200px] truncate px-4 py-3 text-xs text-gray-500">
                  {o.items.map((i: any) => `${i.productName} ×${i.quantity}`).join(', ')}
                </td>
                <td className="px-4 py-3 font-semibold">{money(Number(o.total), o.currency)}</td>
                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">{new Date(o.createdAt).toLocaleDateString('en-US')}</td>
                <td className="px-4 py-3 text-right">
                  <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setOpen(o)}>Manage</button>
                </td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No orders found.</td></tr>}
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
