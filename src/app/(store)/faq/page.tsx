'use client';

import { useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/icons';
import { useT } from '@/components/Providers';

const FAQ_COUNT = 8;

export default function FaqPage() {
  const t = useT();
  const [open, setOpen] = useState<number | null>(0);
  const faqs = Array.from({ length: FAQ_COUNT }, (_, i) => ({ q: t(`faq.q${i + 1}`), a: t(`faq.a${i + 1}`) }));

  return (
    <div className="container max-w-3xl py-10">
      <div className="text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-600">
          <Icon name="chat" size={24} />
        </span>
        <h1 className="mt-4 text-3xl font-extrabold">{t('faq.title')}</h1>
        <p className="mt-2 text-sm text-gray-500">{t('faq.sub')}</p>
      </div>

      <div className="mt-8 space-y-3">
        {faqs.map((item, i) => (
          <div key={i} className="card overflow-hidden">
            <button
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              onClick={() => setOpen(open === i ? null : i)}
            >
              <span className="text-sm font-semibold">{item.q}</span>
              <Icon
                name="chevron-right"
                size={16}
                className={`shrink-0 text-gray-400 transition-transform ${open === i ? 'rotate-90' : ''}`}
              />
            </button>
            {open === i && (
              <p className="border-t border-gray-100 px-5 py-4 text-sm leading-relaxed text-gray-600">{item.a}</p>
            )}
          </div>
        ))}
      </div>

      <div className="card mt-8 flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="font-semibold">{t('faq.stillNeedHelp')}</p>
          <p className="text-sm text-gray-500">{t('faq.supportReply')}</p>
        </div>
        <Link href="/refund-policy" className="btn-secondary">{t('faq.refundPolicy')}</Link>
      </div>
    </div>
  );
}
