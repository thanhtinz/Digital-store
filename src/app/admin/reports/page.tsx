'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/client';

import Icon from '@/components/icons';
import StatusBadge from '@/components/StatusBadge';
import { useMoney } from '@/components/Providers';

type Report = {
  days: number;
  totals: { revenue: number; orders: number; avgOrder: number; discountGiven: number; newCustomers: number };
  series: { date: string; revenue: number; orders: number }[];
  topProducts: { name: string; units: number; revenue: number }[];
  byMethod: { method: string; orders: number; revenue: number }[];
  byStatus: { status: string; count: number }[];
};

const RANGES = [7, 30, 90, 365];
const METHOD_LABELS: Record<string, string> = {
  stripe: 'Card (Stripe)', paypal: 'PayPal', balance: 'Wallet balance', manual: 'Marked paid manually',
};

export default function AdminReportsPage() {
  const money = useMoney();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Report | null>(null);

  useEffect(() => {
    setData(null);
    api<Report>(`/api/admin/reports?days=${days}`).then(setData).catch(() => {});
  }, [days]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="mt-0.5 text-sm text-gray-500">Sales performance for the selected period.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 bg-white p-0.5">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setDays(r)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  days === r ? 'bg-brand-600 text-white' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {r === 365 ? '1 year' : `${r} days`}
              </button>
            ))}
          </div>
          <a href={`/api/admin/reports/export?days=${days}`} className="btn-secondary flex items-center gap-1.5 text-sm">
            <Icon name="download" size={15} /> Export CSV
          </a>
        </div>
      </div>

      {!data ? (
        <div className="py-16 text-center text-gray-400">Loading report…</div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {([
              ['credit-card', 'Revenue', money(data.totals.revenue)],
              ['box', 'Paid orders', String(data.totals.orders)],
              ['dashboard', 'Avg order value', money(data.totals.avgOrder)],
              ['ticket', 'Discounts given', money(data.totals.discountGiven)],
              ['users', 'New customers', String(data.totals.newCustomers)],
            ] as const).map(([icon, label, value]) => (
              <div key={label} className="card flex items-center gap-3 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                  <Icon name={icon} size={19} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium uppercase tracking-wide text-gray-400">{label}</span>
                  <span className="mt-0.5 block text-lg font-extrabold">{value}</span>
                </span>
              </div>
            ))}
          </div>

          {/* Revenue chart */}
          <div className="card p-5">
            <h2 className="font-bold">Daily revenue</h2>
            <RevenueChart series={data.series} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top products */}
            <div className="card p-5">
              <h2 className="font-bold">Top products</h2>
              {data.topProducts.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">No paid orders in this period.</p>
              ) : (
                <div className="mt-3 space-y-2.5">
                  {data.topProducts.map((p, i) => {
                    const max = data.topProducts[0].revenue || 1;
                    return (
                      <div key={p.name}>
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <span className="min-w-0 truncate font-medium">
                            <span className="mr-1.5 text-xs font-bold text-gray-400">#{i + 1}</span>
                            {p.name}
                          </span>
                          <span className="shrink-0 text-xs text-gray-500">
                            {p.units} sold · <b className="text-gray-800">{money(p.revenue)}</b>
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                          <div className="h-full rounded-full bg-brand-500" style={{ width: `${(p.revenue / max) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-6">
              {/* Payment methods */}
              <div className="card p-5">
                <h2 className="font-bold">Payment methods</h2>
                {data.byMethod.length === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-400">No data yet.</p>
                ) : (
                  <table className="mt-3 w-full text-sm">
                    <tbody>
                      {data.byMethod.map((m) => (
                        <tr key={m.method} className="border-b border-gray-50 last:border-0">
                          <td className="py-2 font-medium">{METHOD_LABELS[m.method] || m.method}</td>
                          <td className="py-2 text-right text-gray-500">{m.orders} order{m.orders === 1 ? '' : 's'}</td>
                          <td className="py-2 text-right font-semibold">{money(m.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Order status */}
              <div className="card p-5">
                <h2 className="font-bold">Orders by status</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {data.byStatus.map((s) => (
                    <span key={s.status} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                      <StatusBadge status={s.status} />
                      <b className="text-sm">{s.count}</b>
                    </span>
                  ))}
                  {data.byStatus.length === 0 && <p className="text-sm text-gray-400">No orders in this period.</p>}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function RevenueChart({ series }: { series: { date: string; revenue: number; orders: number }[] }) {
  const money = useMoney();
  const max = Math.max(1, ...series.map((s) => s.revenue));
  // For long ranges collapse to weekly buckets so bars stay readable.
  const buckets = series.length > 92
    ? series.reduce<{ date: string; revenue: number; orders: number }[]>((acc, s, i) => {
        if (i % 7 === 0) acc.push({ ...s });
        else {
          acc[acc.length - 1].revenue += s.revenue;
          acc[acc.length - 1].orders += s.orders;
        }
        return acc;
      }, [])
    : series;
  const bmax = Math.max(1, ...buckets.map((s) => s.revenue));

  return (
    <>
      <div className="mt-4 flex h-44 items-end gap-1">
        {buckets.map((s) => (
          <div key={s.date} className="group relative min-w-0 flex-1">
            <div
              className="w-full rounded-t bg-brand-500 transition group-hover:bg-brand-700"
              style={{ height: `${Math.max(2, (s.revenue / bmax) * 168)}px` }}
            />
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[11px] text-white group-hover:block">
              {s.date}{series.length > 92 ? ' (week)' : ''}: {money(s.revenue)} · {s.orders} order{s.orders === 1 ? '' : 's'}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-gray-400">
        <span>{series[0]?.date}</span>
        <span>{series[series.length - 1]?.date}</span>
      </div>
    </>
  );
}
