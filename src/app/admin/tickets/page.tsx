'use client';

import { useCallback, useEffect, useState } from 'react';
import { useStore } from '@/components/Providers';
import { api } from '@/lib/client';
import Icon from '@/components/icons';

const STATUS_BADGE: Record<string, string> = {
  OPEN: 'bg-amber-100 text-amber-700',
  ANSWERED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-200 text-gray-500',
};

export default function AdminTicketsPage() {
  const { toast } = useStore();
  const [tickets, setTickets] = useState<any[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [status, setStatus] = useState('');
  const [active, setActive] = useState<any | null>(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const d = await api<{ tickets: any[]; openCount: number }>(`/api/admin/tickets?status=${status}`);
    setTickets(d.tickets);
    setOpenCount(d.openCount);
  }, [status]);

  useEffect(() => { load().catch(() => {}); }, [load]);

  const action = async (id: number, body: any) => {
    setBusy(true);
    try {
      const d = await api<{ ticket: any }>(`/api/admin/tickets/${id}`, { method: 'PATCH', json: body });
      setActive(d.ticket);
      setReply('');
      await load();
      if (body.action === 'reply') toast('Reply sent — the customer has been emailed');
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (active) {
    return (
      <div className="mx-auto max-w-3xl">
        <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-brand-600" onClick={() => setActive(null)}>
          <Icon name="chevron-left" size={15} /> All tickets
        </button>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold">#{active.id} · {active.subject}</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {active.user.name} · {active.user.email}
              {active.orderCode && <> · order <span className="font-mono font-semibold">#{active.orderCode}</span></>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`badge ${STATUS_BADGE[active.status]}`}>{active.status}</span>
            {active.status !== 'CLOSED' ? (
              <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => action(active.id, { action: 'close' })}>Close ticket</button>
            ) : (
              <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => action(active.id, { action: 'reopen' })}>Reopen</button>
            )}
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {active.messages.map((m: any) => (
            <div key={m.id} className={`flex ${m.isStaff ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.isStaff ? 'rounded-tr-sm bg-brand-600 text-white' : 'rounded-tl-sm border border-gray-200 bg-white shadow-sm'
              }`}>
                <p className={`mb-1 text-[11px] font-bold uppercase tracking-wide ${m.isStaff ? 'text-white/70' : 'text-gray-400'}`}>
                  {m.isStaff ? 'You (support)' : active.user.name}
                </p>
                <p className="whitespace-pre-wrap">{m.content}</p>
                <p className={`mt-1.5 text-[10px] ${m.isStaff ? 'text-white/60' : 'text-gray-400'}`}>
                  {new Date(m.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="card mt-5 p-4">
          <textarea className="input" rows={3} placeholder="Write a reply — the customer is notified by email…" value={reply} onChange={(e) => setReply(e.target.value)} />
          <div className="mt-2 flex justify-end">
            <button className="btn-primary" disabled={busy || !reply.trim()} onClick={() => action(active.id, { action: 'reply', message: reply })}>
              <Icon name="send" size={15} /> {busy ? 'Sending…' : 'Send reply'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Support tickets</h1>
          <p className="mt-0.5 text-sm text-gray-500">{openCount} ticket{openCount === 1 ? '' : 's'} waiting for a reply</p>
        </div>
        <select className="input w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="ANSWERED">Answered</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      <div className="mt-4 space-y-2.5">
        {tickets.map((t) => (
          <button key={t.id} className="card flex w-full items-center gap-3 p-4 text-left transition hover:shadow-md" onClick={() => setActive(t)}>
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${t.status === 'OPEN' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-400'}`}>
              <Icon name="chat" size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="line-clamp-1 text-sm font-semibold">#{t.id} · {t.subject}</span>
              <span className="text-xs text-gray-400">
                {t.user.name} · {t.user.email} · {t.messages.length} message{t.messages.length === 1 ? '' : 's'} · updated{' '}
                {new Date(t.updatedAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            </span>
            <span className={`badge ${STATUS_BADGE[t.status]}`}>{t.status}</span>
          </button>
        ))}
        {tickets.length === 0 && <div className="card p-12 text-center text-gray-400">No tickets found.</div>}
      </div>
    </div>
  );
}
