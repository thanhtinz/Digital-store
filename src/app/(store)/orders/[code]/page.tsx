import { notFound, redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

import StatusBadge from '@/components/StatusBadge';
import PaymentWatcher from './PaymentWatcher';
import OrderActions from './OrderActions';
import Icon from '@/components/icons';
import { getMoneyFormatter } from '@/lib/currency';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Order details' };

export default async function OrderDetailPage({ params }: { params: { code: string } }) {
  const money = await getMoneyFormatter();
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/orders/${params.code}`);

  const order = await prisma.order.findFirst({
    where: { code: params.code, userId: user.id },
    include: { items: true },
  });
  if (!order) notFound();

  return (
    <div className="container max-w-3xl py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Order #{order.code}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Placed {order.createdAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
            {order.paymentMethod && <> · paid via <b className="capitalize">{order.paymentMethod}</b></>}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Live status watcher after gateway redirect */}
      <PaymentWatcher code={order.code} initialStatus={order.status} />

      <OrderActions code={order.code} />

      {/* Progress timeline */}
      {order.status !== 'CANCELLED' && order.status !== 'REFUNDED' && (
        <OrderTimeline status={order.status} />
      )}

      <div className="card mt-6 divide-y divide-gray-100">
        {order.items.map((item) => (
          <div key={item.id} className="p-4">
            <div className="flex gap-4">
              <div className="h-14 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-gray-300"><Icon name="box" size={24} /></div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{item.productName}</p>
                <p className="text-xs text-gray-500">{item.packageName} × {item.quantity}</p>
                {item.customFieldsData && Object.keys(item.customFieldsData as object).length > 0 && (
                  <p className="mt-1 text-xs text-gray-400">
                    {Object.entries(item.customFieldsData as Record<string, string>)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(' · ')}
                  </p>
                )}
              </div>
              <span className="text-sm font-bold">{money(Number(item.lineTotal), order.currency)}</span>
            </div>
            {/* Delivered content */}
            {item.deliveryData && (
              <div className="mt-3 rounded-lg bg-gray-900 p-3.5">
                <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-green-400"><Icon name="check" size={13} /> Delivered — your item</p>
                <pre className="mt-1.5 select-all whitespace-pre-wrap break-all font-mono text-xs text-gray-100">{item.deliveryData}</pre>
              </div>
            )}
            {!item.deliveryData && (order.status === 'PAID' || order.status === 'COMPLETED') && (
              <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
                <Icon name="clock" size={14} className="shrink-0" /> This item is being prepared — you&apos;ll receive it here and by email shortly.
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="card mt-4 space-y-1.5 p-5 text-sm">
        <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{money(Number(order.subtotal), order.currency)}</span></div>
        {Number(order.discount) > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount {order.couponCode ? `(${order.couponCode})` : ''}</span>
            <span>−{money(Number(order.discount), order.currency)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold">
          <span>Total</span><span>{money(Number(order.total), order.currency)}</span>
        </div>
      </div>
    </div>
  );
}

function OrderTimeline({ status }: { status: string }) {
  const steps = [
    { key: 'placed', label: 'Order placed', icon: 'cart' },
    { key: 'paid', label: 'Payment confirmed', icon: 'credit-card' },
    { key: 'awaiting', label: 'Preparing delivery', icon: 'truck' },
    { key: 'delivered', label: 'Delivered', icon: 'check' },
  ];
  const activeIndex = status === 'COMPLETED' ? 3 : status === 'PAID' ? 2 : 0;
  return (
    <div className="card mt-6 px-6 py-5">
      <div className="flex items-center">
        {steps.map((step, i) => (
          <div key={step.key} className={`flex items-center ${i > 0 ? 'flex-1' : ''}`}>
            {i > 0 && (
              <div className={`mx-3 h-0.5 flex-1 rounded ${i <= activeIndex ? 'bg-brand-600' : 'bg-gray-200'}`} />
            )}
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={`grid h-9 w-9 place-items-center rounded-full ${
                  i <= activeIndex ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-400'
                }`}
              >
                <Icon name={step.icon} size={16} />
              </span>
              <span className={`whitespace-nowrap text-[11px] font-semibold ${i <= activeIndex ? 'text-gray-900' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
