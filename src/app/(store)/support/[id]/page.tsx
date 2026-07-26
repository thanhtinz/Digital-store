'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/components/Providers';
import { api } from '@/lib/client';
import Icon from '@/components/icons';

export default function TicketThreadPage() {
  const { user, toast } = useStore();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<any | null>(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api<{ ticket: any }>(`/api/support/${params.id}`).then((d) => setTicket(d.ticket));

  useEffect(() => {
    if (user === null) router.replace(`/login?next=/support/${params.id}`);
    if (user) load().catch(() => router.replace('/support'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const d = await api<{ ticket: any }>(`/api/support/${params.id}`, { method: 'POST', json: { message: reply } });
      setTicket(d.ticket);
      setReply('');
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!ticket) return <div className="container py-16 text-center text-gray-400">Loading ticket…</div>;

  return (
    <div className="container max-w-3xl py-8">
      <Link href="/support" className="flex items-center gap-1 text-sm text-gray-500 hover:text-brand-600">
        <Icon name="chevron-left" size={15} /> All tickets
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">#{ticket.id} · {ticket.subject}</h1>
        <span className={`badge ${ticket.status === 'ANSWERED' ? 'bg-green-100 text-green-700' : ticket.status === 'CLOSED' ? 'bg-gray-200 text-gray-500' : 'bg-amber-100 text-amber-700'}`}>
          {ticket.status === 'ANSWERED' ? 'Support replied' : ticket.status === 'CLOSED' ? 'Closed' : 'Waiting for support'}
        </span>
      </div>
      {ticket.orderCode && (
        <p className="mt-1 text-sm text-gray-500">
          Related order: <Link href={`/orders/${ticket.orderCode}`} className="font-mono font-semibold text-brand-600 hover:underline">#{ticket.orderCode}</Link>
        </p>
      )}

      {/* Thread */}
      <div className="mt-5 space-y-3">
        {ticket.messages.map((m: any) => (
          <div key={m.id} className={`flex ${m.isStaff ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              m.isStaff ? 'rounded-tl-sm bg-white shadow-sm border border-gray-200' : 'rounded-tr-sm bg-brand-600 text-white'
            }`}>
              <p className={`mb-1 text-[11px] font-bold uppercase tracking-wide ${m.isStaff ? 'text-brand-600' : 'text-white/70'}`}>
                {m.isStaff ? 'Support team' : 'You'}
              </p>
              <p className="whitespace-pre-wrap">{m.content}</p>
              <p className={`mt-1.5 text-[10px] ${m.isStaff ? 'text-gray-400' : 'text-white/60'}`}>
                {new Date(m.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Reply box */}
      <form onSubmit={send} className="card mt-5 p-4">
        <textarea
          className="input"
          rows={3}
          maxLength={5000}
          placeholder={ticket.status === 'CLOSED' ? 'This ticket is closed — replying will reopen it.' : 'Write a reply…'}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
        />
        <div className="mt-2 flex justify-end">
          <button className="btn-primary" disabled={busy || !reply.trim()}>
            <Icon name="send" size={15} /> {busy ? 'Sending…' : 'Send reply'}
          </button>
        </div>
      </form>
    </div>
  );
}
