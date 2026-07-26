'use client';

import { useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/icons';

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'How fast will I receive my order?',
    a: 'Most products are delivered automatically within seconds of payment. Items that require manual processing (like account top-ups) are usually completed within 15 minutes during business hours. You can watch your order status live on the order page.',
  },
  {
    q: 'Where do I find my license key / account after purchase?',
    a: 'Everything is delivered to your order page (Account → My orders) and also emailed to you. The content stays available on the order page permanently, so you can always come back for it.',
  },
  {
    q: 'Which payment methods do you accept?',
    a: 'We accept Visa, Mastercard and American Express through Stripe, plus PayPal. All payments happen on the gateway’s secure hosted page — we never see or store your card details.',
  },
  {
    q: 'Is it safe to buy here?',
    a: 'Yes. Checkout is 256-bit SSL encrypted, payments are processed by Stripe and PayPal (PCI-DSS Level 1), and your account supports two-factor authentication. Reviews on product pages come exclusively from verified buyers.',
  },
  {
    q: 'What is your refund policy?',
    a: 'If a delivered item is invalid or not as described, contact support within 72 hours and we’ll replace it or refund you. See the full refund policy for details.',
  },
  {
    q: 'Do I need an account to buy?',
    a: 'Yes — an account keeps your purchases, delivery content and invoices in one place, and lets us protect your orders. Signing up takes under a minute (or use Google login).',
  },
  {
    q: 'The item I want is out of stock. What can I do?',
    a: 'Stock for auto-delivered items refills regularly. Check back soon, or contact support and we’ll let you know when it’s available.',
  },
  {
    q: 'How do coupon codes work?',
    a: 'Enter your code on the checkout page and press Apply. The discount shows immediately in the order summary. One coupon per order; some codes have minimum order values or expiry dates.',
  },
];

export default function FaqPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="container max-w-3xl py-10">
      <div className="text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-600">
          <Icon name="chat" size={24} />
        </span>
        <h1 className="mt-4 text-3xl font-extrabold">Frequently asked questions</h1>
        <p className="mt-2 text-sm text-gray-500">
          Can&apos;t find what you&apos;re looking for? Email us — we answer fast.
        </p>
      </div>

      <div className="mt-8 space-y-3">
        {FAQS.map((item, i) => (
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
          <p className="font-semibold">Still need help?</p>
          <p className="text-sm text-gray-500">Our support team typically replies within a few hours.</p>
        </div>
        <Link href="/refund-policy" className="btn-secondary">Refund policy</Link>
      </div>
    </div>
  );
}
