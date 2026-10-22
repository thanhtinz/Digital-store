'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';
import Icon from './icons';
import { useMoney, useStore, useT } from './Providers';
import { INTL_LOCALE } from '@/i18n';

// The Voucher type and voucherHeadline live in '@/lib/voucher' (a server-safe
// module): the homepage Server Component calls voucherHeadline during SSR,
// and plain function exports of a 'use client' module are not callable from
// the server in the production bundle.
import { voucherHeadline, type Voucher } from '@/lib/voucher';

export type { Voucher };

export function CopyCodeButton({ code, className = '' }: { code: string; className?: string }) {
  const t = useT();
  const { toast } = useStore();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Clipboard can be unavailable (non-secure context) — still confirm.
    }
    setCopied(true);
    toast(t('home.voucherCopied', { code }));
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={copy}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold shadow-btn-primary transition active:scale-95 ${
        copied ? 'bg-emerald-500 text-white' : 'bg-gradient-to-b from-brand-500 to-brand-600 text-white hover:brightness-110'
      } ${className}`}
    >
      <Icon name={copied ? 'check' : 'copy'} size={13} />
      {copied ? t('home.voucherCopiedShort') : t('home.voucherCopy')}
    </button>
  );
}

// Ticket-style voucher: brand-gradient stub, dashed perforation with punched
// notches (mask), code + conditions + copy button on the body.
export default function VoucherCard({ voucher }: { voucher: Voucher }) {
  const t = useT();
  const money = useMoney();
  const { locale } = useStore();

  const conditions: string[] = [];
  if (voucher.minOrder != null) conditions.push(t('home.voucherMinOrder', { amount: money(voucher.minOrder) }));
  if (voucher.type === 'PERCENT' && voucher.maxDiscount != null) {
    conditions.push(t('home.voucherMaxOff', { amount: money(voucher.maxDiscount) }));
  }
  if (voucher.endsAt) {
    const date = new Intl.DateTimeFormat(INTL_LOCALE[locale], { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(voucher.endsAt));
    conditions.push(t('home.voucherExpires', { date }));
  }

  // Punched notches on the perforation line (top & bottom at the stub edge).
  const notchMask =
    'radial-gradient(circle 8px at 37% 0, transparent 7.5px, black 8.6px), radial-gradient(circle 8px at 37% 100%, transparent 7.5px, black 8.6px)';
  const maskStyle: CSSProperties = {
    WebkitMaskImage: notchMask,
    WebkitMaskComposite: 'source-in',
    maskImage: notchMask,
    maskComposite: 'intersect',
  };

  return (
    <div
      className="relative flex overflow-hidden rounded-2xl bg-white/70 shadow-glass ring-1 ring-white/70 backdrop-blur-xl"
      style={maskStyle}
    >
      <div className="flex w-[37%] shrink-0 flex-col items-center justify-center gap-1 bg-gradient-to-br from-brand-500 to-brand-700 px-3 py-4 text-center text-white">
        <Icon name="ticket" size={20} className="opacity-80" />
        <p className="text-base font-extrabold leading-tight sm:text-lg">{voucherHeadline(voucher, t, money)}</p>
      </div>
      <div className="relative flex min-w-0 flex-1 flex-col justify-center gap-1.5 px-4 py-3">
        <span className="pointer-events-none absolute bottom-2 left-0 top-2 border-s border-dashed border-gray-300" />
        <p className="truncate font-mono text-base font-extrabold tracking-[.14em] text-gray-900">{voucher.code}</p>
        {conditions.length > 0 && (
          <p className="line-clamp-2 text-[11px] leading-snug text-gray-500">{conditions.join(' · ')}</p>
        )}
        <div className="mt-0.5">
          <CopyCodeButton code={voucher.code} />
        </div>
      </div>
    </div>
  );
}
