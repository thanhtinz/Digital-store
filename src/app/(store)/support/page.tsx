'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore, useT } from '@/components/Providers';
import { api } from '@/lib/client';
import Icon from '@/components/icons';
import { AttachmentPicker, useAttachmentLabels } from '@/components/TicketParts';
import { formatDate } from '@/lib/utils';
import { INTL_LOCALE } from '@/i18n';

const STATUS_BADGE: Record<string, string> = {
  OPEN: 'bg-amber-100 text-amber-700',
  ANSWERED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-200 text-gray-500',
};
export default function SupportPage() {
  const { user, toast, locale } = useStore();
  const t = useT();
  const attachLabels = useAttachmentLabels();
  const intlLocale = INTL_LOCALE[locale];
  const router = useRouter();
  const [tickets, setTickets] = useState<any[] | null>(null);
  const [subject, setSubject] = useState('');
  const [orderCode, setOrderCode] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user === null) router.replace('/login?next=/support');
    if (user) api<{ tickets: any[] }>('/api/support').then((d) => setTickets(d.tickets)).catch(() => setTickets([]));
    // Pre-fill the order code when arriving from an order page.
    const fromOrder = new URLSearchParams(window.location.search).get('order');
    if (fromOrder) setOrderCode(fromOrder.toUpperCase());
  }, [user, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const d = await api<{ ticket: { id: number } }>('/api/support', {
        method: 'POST',
        json: { subject, message, orderCode: orderCode || undefined, attachments },
      });
      toast(t('support.created'));
      router.push(`/support/${d.ticket.id}`);
    } catch (e: any) {
      toast(e.message, 'error');
      setBusy(false);
    }
  };

  if (!user || tickets === null) {
    return <div className="container py-16 text-center text-gray-400">{t('support.loading')}</div>;
  }

  return (
    <div className="container py-8">
      <p className="section-eyebrow">{t('support.eyebrow')}</p>
      <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{t('support.title')}</h1>
      <p className="mt-1 text-sm text-gray-500">{t('support.intro')}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[420px_1fr]">
        {/* New ticket */}
        <div className="card h-fit p-5">
          <h2 className="flex items-center gap-2 font-bold">
            <Icon name="chat" size={18} className="text-brand-600" /> {t('support.newTicket')}
          </h2>
          <form onSubmit={submit} className="mt-4 space-y-3">
            <div>
              <label className="label">{t('support.subject')}</label>
              <input className="input" required maxLength={200} placeholder={t('support.subjectPlaceholder')} value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div>
              <label className="label">{t('support.orderCode')}</label>
              <input className="input font-mono uppercase" maxLength={20} placeholder={t('support.orderPlaceholder')} value={orderCode} onChange={(e) => setOrderCode(e.target.value.toUpperCase())} />
            </div>
            <div>
              <label className="label">{t('support.describe')}</label>
              <textarea className="input" rows={5} required maxLength={5000} placeholder={t('support.describePlaceholder')} value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
            <AttachmentPicker attachments={attachments} onChange={setAttachments} toast={toast} labels={attachLabels} />
            <button className="btn-primary w-full" disabled={busy}>
              <Icon name="send" size={16} /> {busy ? t('support.creating') : t('support.create')}
            </button>
          </form>
        </div>

        {/* Ticket list */}
        <div>
          <h2 className="mb-3 font-bold">{t('support.yourTickets')}</h2>
          {tickets.length === 0 ? (
            <div className="card p-10 text-center text-sm text-gray-400">{t('support.noTickets')}</div>
          ) : (
            <div className="space-y-2.5">
              {tickets.map((ticket) => (
                <Link key={ticket.id} href={`/support/${ticket.id}`} className="card flex items-center gap-3 p-4 transition hover:shadow-md">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${ticket.status === 'ANSWERED' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                    <Icon name="chat" size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-1 text-sm font-semibold">#{ticket.id} · {ticket.subject}</span>
                    <span className="text-xs text-gray-400">
                      {ticket._count.messages === 1
                        ? t('support.messageCountOne')
                        : t('support.messageCount', { count: ticket._count.messages })}
                      {' · '}
                      {t('support.updatedAt', { date: formatDate(ticket.updatedAt, intlLocale, { month: 'short', day: 'numeric' }) })}
                      {ticket.orderCode && <> · {t('support.forOrder', { code: ticket.orderCode })}</>}
                    </span>
                  </span>
                  <span className={`badge ${STATUS_BADGE[ticket.status]}`}>{t(`support.status${ticket.status}`)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
