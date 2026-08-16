'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore, useMoney } from '@/components/Providers';
import { api } from '@/lib/client';
import { AttachmentPicker } from '@/components/TicketParts';
import Icon from '@/components/icons';

type Instructions = {
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  memo: string;
  amount: number;
  currency: string;
  qrUrl: string | null;
  instructions: string;
  requiresProof: boolean;
};

type Payment = {
  id: number;
  ref: number;
  purpose: 'ORDER' | 'TOPUP' | 'GIFTCARD';
  method: string;
  status: 'PENDING' | 'AWAITING_REVIEW' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'FAILED';
  baseAmount: number;
  baseCurrency: string;
  chargeAmount: number;
  chargeCurrency: string;
  memo: string | null;
  expiresAt: string | null;
  orderCode: string | null;
  instructions: Instructions | null;
};

// Amounts in the charge currency are whole numbers for VND-like currencies,
// and the customer has to retype them, so group them clearly.
function formatCharge(amount: number, currency: string): string {
  const zeroDecimal = ['VND', 'JPY', 'KRW'].includes(currency.toUpperCase());
  return `${amount.toLocaleString('en-US', {
    minimumFractionDigits: zeroDecimal ? 0 : 2,
    maximumFractionDigits: zeroDecimal ? 0 : 2,
  })} ${currency.toUpperCase()}`;
}

export default function PayScreen({ id }: { id: string }) {
  const { user, toast, refreshUser } = useStore();
  const money = useMoney();
  const router = useRouter();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [proof, setProof] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [qrFailed, setQrFailed] = useState(false);
  const polls = useRef(0);

  const load = useCallback(async () => {
    try {
      const d = await api<{ payment: Payment }>(`/api/payments/${id}`);
      setPayment(d.payment);
      return d.payment;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  }, [id]);

  useEffect(() => {
    if (user === null) router.replace(`/login?next=/pay/${id}`);
    if (user) load();
  }, [user, id, load, router]);

  // Poll while the payment is still open, with a cap so an abandoned tab does
  // not keep hitting the API forever.
  useEffect(() => {
    if (!payment || payment.status === 'PAID') return;
    if (polls.current > 120) return;
    const t = setTimeout(async () => {
      polls.current += 1;
      const fresh = await load();
      if (fresh?.status === 'PAID') {
        await refreshUser();
        toast('Payment received');
      }
    }, 4000);
    return () => clearTimeout(t);
  }, [payment, load, refreshUser, toast]);

  const submitProof = async () => {
    setBusy(true);
    try {
      await api(`/api/payments/${id}/proof`, {
        method: 'POST',
        json: { proofUrl: proof[0], payerNote: note },
      });
      toast('Thanks — we will confirm your transfer shortly');
      await load();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast(`${label} copied`);
  };

  if (error) {
    return (
      <div className="container py-16 text-center">
        <p className="font-semibold">{error}</p>
        <Link href="/orders" className="btn-primary mt-5 inline-flex">Go to my orders</Link>
      </div>
    );
  }
  if (!payment) return <div className="container py-16 text-center text-gray-400">Loading payment…</div>;

  const successHref =
    payment.purpose === 'ORDER' && payment.orderCode
      ? `/orders/${payment.orderCode}`
      : payment.purpose === 'TOPUP'
        ? '/wallet'
        : '/gift-cards';

  if (payment.status === 'PAID') {
    return (
      <div className="container py-16">
        <div className="card mx-auto max-w-md p-8 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-green-100 text-green-600">
            <Icon name="check" size={28} />
          </span>
          <h1 className="mt-4 text-xl font-bold">Payment received</h1>
          <p className="mt-1 text-sm text-gray-500">
            {payment.purpose === 'TOPUP'
              ? `${money(payment.baseAmount)} has been added to your wallet.`
              : 'Your payment is confirmed.'}
          </p>
          <Link href={successHref} className="btn-primary mt-6 inline-flex">Continue</Link>
        </div>
      </div>
    );
  }

  if (['EXPIRED', 'CANCELLED', 'FAILED'].includes(payment.status)) {
    return (
      <div className="container py-16">
        <div className="card mx-auto max-w-md p-8 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-red-100 text-red-600">
            <Icon name="x" size={26} />
          </span>
          <h1 className="mt-4 text-xl font-bold">
            {payment.status === 'EXPIRED' ? 'This payment expired' : 'This payment was not completed'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Nothing was charged. You can start again whenever you are ready.
          </p>
          <Link href={successHref} className="btn-primary mt-6 inline-flex">Try again</Link>
        </div>
      </div>
    );
  }

  const ins = payment.instructions;
  const reviewing = payment.status === 'AWAITING_REVIEW';

  return (
    <div className="container py-8">
      <p className="section-eyebrow">Almost done</p>
      <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Complete your bank transfer</h1>
      <p className="mt-1 text-sm text-gray-500">
        Transfer the exact amount with the reference below. {payment.method === 'sepay'
          ? 'Your order is confirmed automatically, usually within a minute of the transfer landing.'
          : 'We confirm manually once the transfer arrives.'}
      </p>

      {!ins ? (
        <div className="card mt-6 p-8 text-center text-gray-500">
          Bank details are not configured. Please contact support.
        </div>
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-[340px_1fr]">
          {/* QR */}
          <div className="card p-5 text-center">
            {ins.qrUrl && !qrFailed ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ins.qrUrl}
                  alt="Bank transfer QR code"
                  className="mx-auto w-full max-w-[260px] rounded-xl"
                  onError={() => setQrFailed(true)}
                />
                <p className="mt-3 text-xs text-gray-500">
                  Scan with your banking app — the amount and reference are filled in for you.
                </p>
              </>
            ) : (
              <div className="py-8">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gray-100 text-gray-400">
                  <Icon name="credit-card" size={26} />
                </span>
                <p className="mt-3 text-xs text-gray-500">
                  Transfer manually using the details on the right — they are all you need.
                </p>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div className="card p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-bold">Transfer details</h2>
                <span className="text-xs text-gray-400">
                  {money(payment.baseAmount, payment.baseCurrency)} at your locked rate
                </span>
              </div>
              <dl className="mt-4 space-y-3">
                <Row label="Bank" value={[ins.bankName, ins.bankCode].filter(Boolean).join(' · ') || '—'} />
                <Row label="Account number" value={ins.accountNumber} onCopy={() => copy(ins.accountNumber, 'Account number')} />
                <Row label="Account name" value={ins.accountName || '—'} />
                <Row
                  label="Amount"
                  value={formatCharge(ins.amount, ins.currency)}
                  onCopy={() => copy(String(Math.round(ins.amount)), 'Amount')}
                  strong
                />
                <Row label="Transfer reference" value={ins.memo} onCopy={() => copy(ins.memo, 'Reference')} strong />
              </dl>
              <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
                The reference <b>{ins.memo}</b> is how we match your transfer. If your bank strips it, contact support
                with your receipt and we will sort it out.
              </p>
              {ins.instructions && (
                <p className="mt-3 whitespace-pre-line text-sm text-gray-600">{ins.instructions}</p>
              )}
            </div>

            {ins.requiresProof && (
              <div className="card p-5">
                {reviewing ? (
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-600">
                      <Icon name="clock" size={20} />
                    </span>
                    <div>
                      <h2 className="font-bold">Waiting for confirmation</h2>
                      <p className="mt-0.5 text-sm text-gray-500">
                        We have your details and are checking the transfer. This page updates by itself — you can also
                        close it and we will email you.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="font-bold">Already transferred?</h2>
                    <p className="mt-0.5 text-sm text-gray-500">
                      Let us know and we will confirm it. Attaching the receipt makes it faster.
                    </p>
                    <textarea
                      className="input mt-3 min-h-[80px]"
                      placeholder="Optional: the name on the sending account, or anything that helps us find it"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                    <div className="mt-3">
                      <AttachmentPicker attachments={proof} onChange={setProof} toast={toast} />
                    </div>
                    <button className="btn-primary mt-4 w-full" onClick={submitProof} disabled={busy}>
                      {busy ? 'Sending…' : 'I have made the transfer'}
                    </button>
                  </>
                )}
              </div>
            )}

            {payment.method === 'sepay' && (
              <div className="card flex items-center gap-3 p-5">
                <span className="relative flex h-3 w-3 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-brand-500" />
                </span>
                <p className="text-sm text-gray-600">
                  Watching for your transfer. This page confirms itself the moment the bank notifies us.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, onCopy, strong }: { label: string; value: string; onCopy?: () => void; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-2 last:border-0">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="flex min-w-0 items-center gap-2">
        <span className={`truncate ${strong ? 'text-base font-extrabold' : 'text-sm font-semibold'}`}>{value}</span>
        {onCopy && (
          <button
            aria-label={`Copy ${label}`}
            onClick={onCopy}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-brand-600"
          >
            <Icon name="copy" size={14} />
          </button>
        )}
      </dd>
    </div>
  );
}
