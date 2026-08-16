'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/client';
import Icon from '@/components/icons';
import { useT } from '@/components/Providers';

// After returning from Stripe/PayPal the webhook may land a moment later than
// the buyer. Poll the status endpoint briefly and refresh once paid.
export default function PaymentWatcher({ code, initialStatus }: { code: string; initialStatus: string }) {
  const router = useRouter();
  const t = useT();
  const params = useSearchParams();
  const flag = params.get('payment');
  const [status, setStatus] = useState(initialStatus);
  const attempts = useRef(0);

  useEffect(() => {
    if (status !== 'PENDING') return;
    const timer = setInterval(async () => {
      attempts.current += 1;
      if (attempts.current > 40) { clearInterval(timer); return; }
      try {
        const d = await api<{ status: string }>(`/api/orders/${code}/status`);
        if (d.status !== 'PENDING') {
          setStatus(d.status);
          clearInterval(timer);
          router.refresh();
        }
      } catch {
        /* keep polling */
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [status, code, router]);

  if (status !== 'PENDING') {
    if (flag === 'success') {
      return (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-green-50 p-4 text-sm font-medium text-green-700">
          <Icon name="check" size={18} /> {t('orders.paidBanner')}
        </div>
      );
    }
    return null;
  }

  if (flag === 'cancelled') {
    return (
      <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-700">
        {t('orders.cancelledBanner')}
      </div>
    );
  }
  return (
    <div className="mt-4 flex items-center gap-3 rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      {t('orders.waitingBanner')}
    </div>
  );
}
