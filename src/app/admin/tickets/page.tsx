'use client';

import { useCallback, useEffect, useState } from 'react';
import { ADMIN_INTL_LOCALE, useAdminT, useStore } from '@/components/Providers';
import { api } from '@/lib/client';
import Icon from '@/components/icons';
import { AttachmentPicker, MessageBubble } from '@/components/TicketParts';

const STATUS_BADGE: Record<string, string> = {
  OPEN: 'bg-amber-100 text-amber-700',
  ANSWERED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-200 text-gray-500',
};

export default function AdminTicketsPage() {
  const { toast } = useStore();
  const t = useAdminT();
  const [tickets, setTickets] = useState<any[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [status, setStatus] = useState('');
  const [active, setActive] = useState<any | null>(null);
  const [reply, setReply] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
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
      setAttachments([]);
      await load();
      if (body.action === 'reply') toast(t('admin.tickets.replyToast'));
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
          <Icon name="chevron-left" size={15} /> {t('admin.tickets.all')}
        </button>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold">#{active.id} · {active.subject}</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {active.user.name} · {active.user.email}
              {active.orderCode && <> · {t('admin.tickets.orderRef')} <span className="font-mono font-semibold">#{active.orderCode}</span></>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`badge ${STATUS_BADGE[active.status]}`}>{t(`admin.ticketStatus.${active.status}`)}</span>
            {active.status !== 'CLOSED' ? (
              <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => action(active.id, { action: 'close' })}>{t('admin.tickets.close')}</button>
            ) : (
              <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => action(active.id, { action: 'reopen' })}>{t('admin.tickets.reopen')}</button>
            )}
          </div>
        </div>

        <div className="card mt-4 overflow-hidden">
          <div className="max-h-[520px] space-y-3 overflow-y-auto bg-gray-50 px-4 py-5 sm:px-5">
            {active.messages.map((m: any) => (
              <MessageBubble
                key={m.id}
                message={m}
                mine={m.isStaff}
                authorLabel={m.isStaff ? t('admin.tickets.youSupport') : active.user.name}
              />
            ))}
          </div>
          <div className="border-t border-gray-100 p-4">
            <textarea className="input" rows={3} placeholder={t('admin.tickets.replyPlaceholder')} value={reply} onChange={(e) => setReply(e.target.value)} />
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3">
              <AttachmentPicker attachments={attachments} onChange={setAttachments} toast={toast} />
              <button className="btn-primary" disabled={busy || (!reply.trim() && !attachments.length)} onClick={() => action(active.id, { action: 'reply', message: reply, attachments })}>
                <Icon name="send" size={15} /> {busy ? t('admin.tickets.sending') : t('admin.tickets.sendReply')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('admin.tickets.title')}</h1>
          <p className="mt-0.5 text-sm text-gray-500">{t('admin.tickets.waitingCount', { count: openCount })}</p>
        </div>
        <select className="input w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t('admin.orders.allStatuses')}</option>
          <option value="OPEN">{t('admin.ticketStatus.OPEN')}</option>
          <option value="ANSWERED">{t('admin.ticketStatus.ANSWERED')}</option>
          <option value="CLOSED">{t('admin.ticketStatus.CLOSED')}</option>
        </select>
      </div>

      <div className="mt-4 space-y-2.5">
        {tickets.map((tk) => (
          <button key={tk.id} className="card flex w-full items-center gap-3 p-4 text-left transition hover:shadow-md" onClick={() => setActive(tk)}>
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tk.status === 'OPEN' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-400'}`}>
              <Icon name="chat" size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="line-clamp-1 text-sm font-semibold">#{tk.id} · {tk.subject}</span>
              <span className="text-xs text-gray-400">
                {tk.user.name} · {tk.user.email} · {t('admin.tickets.messagesCount', { count: tk.messages.length })} · {t('admin.tickets.updatedPrefix')}{' '}
                {new Date(tk.updatedAt).toLocaleString(ADMIN_INTL_LOCALE, { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            </span>
            <span className={`badge ${STATUS_BADGE[tk.status]}`}>{t(`admin.ticketStatus.${tk.status}`)}</span>
          </button>
        ))}
        {tickets.length === 0 && <div className="card p-12 text-center text-gray-400">{t('admin.tickets.empty')}</div>}
      </div>
    </div>
  );
}
