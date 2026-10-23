'use client';

import { useState } from 'react';
import Link from 'next/link';
import Icon from './icons';
import { useT } from './Providers';
import VoucherCard from './VoucherCard';
import type { Voucher } from '@/lib/voucher';

// Homepage voucher strip: only the newest INITIAL vouchers are shown up
// front (the server hands them over newest-first); any extras unfold in
// place behind a "view more" toggle that collapses back.
const INITIAL = 5;

export default function VoucherStrip({ vouchers }: { vouchers: Voucher[] }) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? vouchers : vouchers.slice(0, INITIAL);
  const hiddenCount = vouchers.length - INITIAL;

  return (
    <section id="vouchers" className="scroll-mt-36">
      <div className="mb-5 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-btn-primary">
          <Icon name="ticket" size={17} />
        </span>
        <h2 className="text-xl font-extrabold uppercase tracking-wide text-brand-600 sm:text-2xl">{t('home.voucherTitle')}</h2>
      </div>
      <div className={`grid gap-3 sm:grid-cols-2 ${shown.length >= 4 ? 'xl:grid-cols-4' : shown.length === 3 ? 'xl:grid-cols-3' : 'xl:grid-cols-2'}`}>
        {shown.map((v) => (
          <VoucherCard key={v.code} voucher={v} />
        ))}
      </div>
      {hiddenCount > 0 && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-4 py-2 text-xs font-bold text-brand-700 shadow-glass ring-1 ring-white/70 backdrop-blur transition hover:bg-white/90 active:scale-95"
          >
            {expanded ? t('home.voucherCollapse') : t('home.voucherViewMore', { count: hiddenCount })}
            <Icon name="chevron-right" size={13} className={expanded ? '-rotate-90' : 'rotate-90'} />
          </button>
        </div>
      )}
      <div className="mt-4 text-center">
        <Link
          href="/vouchers"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 transition hover:text-brand-800 hover:underline"
        >
          {t('home.voucherViewAll')} <Icon name="arrow-right" size={13} />
        </Link>
      </div>
    </section>
  );
}
