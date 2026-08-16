'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useStore, useT } from '@/components/Providers';
import { api } from '@/lib/client';
import Icon from '@/components/icons';
import { AttachmentPicker, MessageBubble, useAttachmentLabels } from '@/components/TicketParts';

export default function TicketThreadPage() {
  const { user, toast } = useStore();
  const t = useT();
  const attachLabels = useAttachmentLabels();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<any | null>(null);
  const [reply, setReply] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
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
      const d = await api<{ ticket: any }>(`/api/support/${params.id}`, {
        method: 'POST',
        json: { message: reply, attachments },
      });
      setTicket(d.ticket);
      setReply('');
      setAttachments([]);
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!ticket) return <div className="container py-16 text-center text-gray-400">{t('support.loadingTicket')}</div>;

  return (
    <div className="container max-w-3xl py-8">
      <Link href="/support" className="flex items-center gap-1 text-sm text-gray-500 hover:text-brand-600">
        <Icon name="chevron-left" size={15} /> {t('support.allTickets')}
      </Link>

      {/* Framed conversation card */}
      <div className="card mt-3 overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-gray-50/60 px-5 py-4">
          <div>
            <h1 className="text-lg font-bold">#{ticket.id} · {ticket.subject}</h1>
            {ticket.orderCode && (
              <p className="mt-0.5 text-sm text-gray-500">
                {t('support.relatedOrder')}{' '}
                <Link href={`/orders/${ticket.orderCode}`} className="font-mono font-semibold text-brand-600 hover:underline">
                  #{ticket.orderCode}
                </Link>
              </p>
            )}
          </div>
          <span className={`badge ${ticket.status === 'ANSWERED' ? 'bg-green-100 text-green-700' : ticket.status === 'CLOSED' ? 'bg-gray-200 text-gray-500' : 'bg-amber-100 text-amber-700'}`}>
            {t(`support.status${ticket.status}`)}
          </span>
        </div>

        {/* Messages */}
        <div className="max-h-[520px] space-y-3 overflow-y-auto bg-gray-50 px-4 py-5 sm:px-5">
          {ticket.messages.map((m: any) => (
            <MessageBubble
              key={m.id}
              message={m}
              mine={!m.isStaff}
              authorLabel={m.isStaff ? t('support.staff') : t('support.you')}
            />
          ))}
        </div>

        {/* Reply box */}
        <form onSubmit={send} className="border-t border-gray-100 p-4">
          <textarea
            className="input"
            rows={3}
            maxLength={5000}
            placeholder={ticket.status === 'CLOSED' ? t('support.closedPlaceholder') : t('support.replyPlaceholder')}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
          />
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3">
            <AttachmentPicker attachments={attachments} onChange={setAttachments} toast={toast} labels={attachLabels} />
            <button className="btn-primary" disabled={busy || (!reply.trim() && !attachments.length)}>
              <Icon name="send" size={15} /> {busy ? t('support.sending') : t('support.sendReply')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
