'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useStore, useMoney } from '@/components/Providers';
import { api } from '@/lib/client';
import Icon from '@/components/icons';

type Payment = {
  id: number;
  ref: number;
  purpose: 'ORDER' | 'TOPUP' | 'GIFTCARD';
  method: string;
  status: string;
  baseAmount: number;
  baseCurrency: string;
  chargeAmount: number;
  chargeCurrency: string;
  memo: string | null;
  proofUrl: string | null;
  payerNote: string | null;
  email: string;
  name: string;
  orderCode: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
};

const TABS = [
  { key: 'review', label: 'Awaiting review' },
  { key: 'pending', label: 'Not yet paid' },
  { key: 'all', label: 'Last 30 days' },
];

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-600',
  AWAITING_REVIEW: 'bg-amber-100 text-amber-700',
  PAID: 'bg-green-100 text-green-700',
  EXPIRED: 'bg-gray-200 text-gray-500',
  CANCELLED: 'bg-gray-200 text-gray-500',
  FAILED: 'bg-red-100 text-red-700',
};

const PURPOSE_LABEL: Record<string, string> = { ORDER: 'Order', TOPUP: 'Wallet top-up', GIFTCARD: 'Gift card' };

export default function AdminPaymentsPage() {
  const { toast } = useStore();
  const money = useMoney();
  const [tab, setTab] = useState('review');
  const [rows, setRows] = useState<Payment[] | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    setRows(null);
    try {
      const d = await api<{ payments: Payment[] }>(`/api/admin/payments?filter=${tab}`);
      setRows(d.payments);
    } catch (e: any) {
      toast(e.message, 'error');
      setRows([]);
    }
  }, [tab, toast]);

  useEffect(() => { load(); }, [load]);

  const act = async (id: number, action: 'approve' | 'reject') => {
    if (action === 'reject' && !confirm('Reject this payment? The order or top-up it was paying for will be released.')) return;
    setBusy(id);
    try {
      await api('/api/admin/payments', { method: 'PATCH', json: { id, action } });
      toast(action === 'approve' ? 'Payment confirmed' : 'Payment rejected');
      await load();
    } catch (e: any) {
      toast(e.message, 'error');
      await load();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Payment reviews</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Bank transfers customers say they have made. Confirming one settles whatever it was paying for — an order is
          delivered, a top-up credits the wallet, a gift card is activated.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold shadow-sm transition ${
              tab === t.key ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {rows === null ? (
        <div className="card p-12 text-center text-gray-400">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">
          {tab === 'review' ? 'No transfers are waiting for confirmation.' : 'Nothing here.'}
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((p) => (
            <div key={p.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold">{p.memo || p.ref}</span>
                    <span className={`badge ${STATUS_BADGE[p.status] || 'bg-gray-100 text-gray-600'}`}>{p.status.replace('_', ' ')}</span>
                    <span className="badge bg-gray-100 text-gray-600">{p.method}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    {PURPOSE_LABEL[p.purpose] || p.purpose}
                    {p.orderCode && (
                      <> · <Link href={`/admin/orders?q=${p.orderCode}`} className="font-medium text-brand-600 hover:underline">{p.orderCode}</Link></>
                    )}
                    {' · '}{p.name || p.email}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {new Date(p.createdAt).toLocaleString('en-US')}
                    {p.reviewedAt && ` · reviewed ${new Date(p.reviewedAt).toLocaleString('en-US')}`}
                  </p>
                  {p.payerNote && <p className="mt-2 rounded-lg bg-gray-50 p-2 text-sm text-gray-600">{p.payerNote}</p>}
                  {p.reviewNote && <p className="mt-2 text-xs text-gray-500">Note: {p.reviewNote}</p>}
                </div>

                <div className="flex items-center gap-3">
                  {p.proofUrl && (
                    <a href={p.proofUrl} target="_blank" rel="noreferrer" className="shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.proofUrl} alt="Transfer receipt" className="h-16 w-16 rounded-lg border border-gray-200 object-cover" />
                    </a>
                  )}
                  <div className="text-right">
                    <p className="text-base font-extrabold">
                      {p.chargeAmount.toLocaleString('en-US')} {p.chargeCurrency}
                    </p>
                    <p className="text-xs text-gray-400">{money(p.baseAmount, p.baseCurrency)} booked</p>
                  </div>
                </div>
              </div>

              {(p.status === 'AWAITING_REVIEW' || p.status === 'PENDING') && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                  <button className="btn-primary" disabled={busy === p.id} onClick={() => act(p.id, 'approve')}>
                    <Icon name="check" size={15} /> {busy === p.id ? 'Working…' : 'Confirm payment'}
                  </button>
                  <button className="btn-secondary" disabled={busy === p.id} onClick={() => act(p.id, 'reject')}>
                    <Icon name="x" size={15} /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
