'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from './Providers';
import { api } from '@/lib/client';
import Icon from './icons';

type Message = { id: number; content: string; isStaff: boolean; createdAt: string };

// Floating live-chat bubble backed by the support-ticket system: one
// rolling "Live chat" ticket per customer, polled while the panel is open.
export default function LiveChat() {
  const { user, toast } = useStore();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [ticketId, setTicketId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Hide on admin (has its own tools) — this component only mounts in the
  // storefront layout, but the pathname guard keeps deep links safe too.
  const hidden = pathname.startsWith('/admin');

  const scrollDown = () => {
    requestAnimationFrame(() => {
      bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
    });
  };

  const loadMessages = async (id: number) => {
    const d = await api<{ ticket: { messages: Message[] } }>(`/api/support/${id}`);
    setMessages(d.ticket.messages);
  };

  // Find (or lazily create on first message) the rolling chat ticket.
  useEffect(() => {
    if (!open || !user) return;
    api<{ tickets: { id: number; subject: string; status: string }[] }>('/api/support')
      .then(async (d) => {
        const chat = d.tickets.find((t) => t.subject === 'Live chat');
        if (chat) {
          setTicketId(chat.id);
          await loadMessages(chat.id);
          scrollDown();
        }
      })
      .catch(() => {});
  }, [open, user]);

  // Poll for staff replies while the panel is open.
  useEffect(() => {
    if (!open || !ticketId) return;
    const t = setInterval(() => loadMessages(ticketId).catch(() => {}), 5000);
    return () => clearInterval(t);
  }, [open, ticketId]);

  useEffect(scrollDown, [messages.length]);

  if (hidden) return null;

  const send = async () => {
    const content = text.trim();
    if (!content) return;
    setBusy(true);
    try {
      if (!ticketId) {
        const d = await api<{ ticket: { id: number } }>('/api/support', {
          method: 'POST',
          json: { subject: 'Live chat', message: content },
        });
        setTicketId(d.ticket.id);
        await loadMessages(d.ticket.id);
      } else {
        await api(`/api/support/${ticketId}`, { method: 'POST', json: { message: content } });
        await loadMessages(ticketId);
      }
      setText('');
      scrollDown();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* Bubble */}
      <button
        aria-label={open ? 'Close chat' : 'Chat with us'}
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-[60] grid h-14 w-14 place-items-center rounded-full bg-gradient-to-b from-brand-500 to-brand-700 text-white shadow-[0_10px_30px_-8px_rgba(79,70,229,.7)] transition hover:scale-105 print:hidden"
      >
        <Icon name={open ? 'x' : 'chat'} size={24} />
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-[60] flex max-h-[70vh] w-[min(92vw,360px)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl print:hidden">
          <div className="flex items-center gap-3 bg-gradient-to-r from-brand-600 to-brand-700 px-4 py-3 text-white">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15">
              <Icon name="chat" size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold">Chat with us</p>
              <p className="text-[11px] text-white/70">We reply as fast as we can — replies also land in your email.</p>
            </div>
          </div>

          {!user ? (
            <div className="p-6 text-center">
              <Icon name="user" size={32} className="mx-auto text-gray-300" />
              <p className="mt-2 text-sm font-semibold">Sign in to start chatting</p>
              <p className="mt-1 text-xs text-gray-500">So we know where to send our reply.</p>
              <Link href={`/login?next=${encodeURIComponent(pathname)}`} className="btn-primary mt-4 inline-flex">
                Sign in
              </Link>
            </div>
          ) : (
            <>
              <div ref={bodyRef} className="flex-1 space-y-2.5 overflow-y-auto bg-gray-50 p-3">
                {messages.length === 0 && (
                  <p className="py-6 text-center text-xs text-gray-400">
                    Ask us anything — orders, payments, delivery. This chat is saved to your support tickets.
                  </p>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.isStaff ? 'justify-start' : 'justify-end'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                        m.isStaff
                          ? 'rounded-tl-sm border border-gray-200 bg-white'
                          : 'rounded-tr-sm bg-brand-600 text-white'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.content}</p>
                      <p className={`mt-0.5 text-[10px] ${m.isStaff ? 'text-gray-400' : 'text-white/60'}`}>
                        {new Date(m.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 border-t border-gray-100 p-3">
                <input
                  className="input flex-1 py-2"
                  placeholder="Type a message…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                />
                <button className="btn-primary shrink-0 px-3" onClick={send} disabled={busy || !text.trim()} aria-label="Send">
                  <Icon name="send" size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
