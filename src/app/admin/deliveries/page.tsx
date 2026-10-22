'use client';

import { useCallback, useEffect, useState } from 'react';
import { ADMIN_INTL_LOCALE, useAdminT, useStore, useMoney } from '@/components/Providers';
import { useAutoRefresh } from '../useAutoRefresh';
import { api } from '@/lib/client';

import Icon from '@/components/icons';

// Delivery queue: every paid order waiting for fulfillment. Enter the
// content, hit "Deliver & notify" — the buyer gets an email instantly and
// the order auto-completes once every item is delivered.
export default function AdminDeliveriesPage() {
  const { toast } = useStore();
  const money = useMoney();
  const t = useAdminT();
  const [orders, setOrders] = useState<any[] | null>(null);
  const [text, setText] = useState<Record<number, string>>({});
  const [busyItem, setBusyItem] = useState<number | null>(null);

  const load = useCallback(async () => {
    const d = await api<{ orders: any[] }>('/api/admin/deliveries');
    setOrders(d.orders);
  }, []);

  useEffect(() => { load().catch(() => {}); }, [load]);
  // The queue refreshes itself — newly paid orders appear without a reload.
  const lastUpdated = useAutoRefresh(load);

  const deliver = async (orderId: number, itemId: number) => {
    setBusyItem(itemId);
    try {
      await api(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        json: { action: 'deliver', itemId, deliveryData: text[itemId] || '' },
      });
      toast(t('admin.deliveries.deliveredToast'));
      setText((t) => ({ ...t, [itemId]: '' }));
      await load();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusyItem(null);
    }
  };

  if (orders === null) return <div className="py-16 text-center text-gray-400">{t('admin.deliveries.loading')}</div>;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('admin.deliveries.title')}</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {t('admin.deliveries.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-400">
              {t('admin.shell.lastUpdated', { time: lastUpdated.toLocaleTimeString(ADMIN_INTL_LOCALE) })}
            </span>
          )}
          <button className="btn-secondary" onClick={() => load()}>
            <Icon name="refresh" size={16} /> {t('admin.deliveries.refresh')}
          </button>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="card mt-6 p-16 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green-50 text-green-600">
            <Icon name="check" size={30} />
          </span>
          <p className="mt-4 font-semibold">{t('admin.deliveries.caughtUp')}</p>
          <p className="mt-1 text-sm text-gray-500">{t('admin.deliveries.emptyText')}</p>
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          {orders.map((o) => (
            <div key={o.id} className="card overflow-hidden">
              {/* Order header */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-gray-100 bg-gray-50/60 px-5 py-3">
                <span className="font-mono text-sm font-bold">#{o.code}</span>
                <span className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Icon name="user" size={14} className="text-gray-400" />
                  {o.user?.name} · {o.email}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Icon name="clock" size={13} />
                  {t('admin.deliveries.paidAt', { time: o.paidAt ? new Date(o.paidAt).toLocaleString(ADMIN_INTL_LOCALE, { dateStyle: 'medium', timeStyle: 'short' }) : '—' })}
                </span>
                <span className="ml-auto text-sm font-bold">{money(Number(o.total), o.currency)}</span>
              </div>

              {/* Items */}
              <div className="divide-y divide-gray-100">
                {o.items.map((item: any) => (
                  <div key={item.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          {item.productName} <span className="font-normal text-gray-400">·</span> {item.packageName} × {item.quantity}
                        </p>
                        {item.customFieldsData && Object.keys(item.customFieldsData).length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {Object.entries(item.customFieldsData as Record<string, string>).map(([k, v]) => (
                              <span key={k} className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                                {k}: <b>{v}</b>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {item.deliveredAt ? (
                        <span className="badge gap-1 bg-green-100 text-green-700">
                          <Icon name="check" size={12} /> {t('admin.deliveries.delivered')}
                        </span>
                      ) : (
                        <span className="badge gap-1 bg-amber-100 text-amber-700">
                          <Icon name="clock" size={12} /> {t('admin.deliveries.waiting')}
                        </span>
                      )}
                    </div>

                    {item.deliveredAt ? (
                      item.deliveryData && (
                        <pre className="mt-2.5 whitespace-pre-wrap break-all rounded-lg bg-gray-900 p-3 font-mono text-xs text-green-300">{item.deliveryData}</pre>
                      )
                    ) : (
                      <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
                        <textarea
                          className="input flex-1 font-mono text-xs"
                          rows={2}
                          placeholder={t('admin.deliveries.placeholder')}
                          value={text[item.id] || ''}
                          onChange={(e) => setText((t) => ({ ...t, [item.id]: e.target.value }))}
                        />
                        <button
                          className="btn-primary shrink-0 sm:self-start"
                          disabled={busyItem === item.id || !(text[item.id] || '').trim()}
                          onClick={() => deliver(o.id, item.id)}
                        >
                          <Icon name="send" size={15} />
                          {busyItem === item.id ? t('admin.deliveries.delivering') : t('admin.deliveries.deliverNotify')}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
