'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client';

import StatusBadge from '@/components/StatusBadge';
import Icon from '@/components/icons';
import { useMoney } from '@/components/Providers';

type Stats = {
  revenue: { total: number; month: number; today: number };
  counts: { orders: number; awaitingDelivery: number; users: number; products: number };
  series: { date: string; revenue: number }[];
  recentOrders: { id: number; code: string; total: number; status: string; customer: string; summary: string; createdAt: string }[];
};

export default function AdminDashboard() {
  const money = useMoney();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api<Stats>('/api/admin/stats').then(setStats).catch(() => {});
  }, []);

  if (!stats) return <div className="py-16 text-center text-gray-400">Loading dashboard…</div>;

  const max = Math.max(1, ...stats.series.map((s) => s.revenue));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {([
          ['clock', 'Revenue today', money(stats.revenue.today), ''],
          ['dashboard', 'Revenue this month', money(stats.revenue.month), ''],
          ['credit-card', 'Total revenue', money(stats.revenue.total), ''],
          ['truck', 'Awaiting delivery', String(stats.counts.awaitingDelivery), '/admin/deliveries'],
        ] as const).map(([icon, label, value, href]) => {
          const inner = (
            <>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                <Icon name={icon} size={19} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-medium uppercase tracking-wide text-gray-400">{label}</span>
                <span className="mt-0.5 block text-xl font-extrabold">{value}</span>
              </span>
            </>
          );
          return href ? (
            <Link key={label} href={href} className="card flex items-center gap-3 p-4 transition hover:border-brand-300 hover:shadow-md">
              {inner}
            </Link>
          ) : (
            <div key={label} className="card flex items-center gap-3 p-4">{inner}</div>
          );
        })}
      </div>

      {/* Revenue chart (last 14 days) */}
      <div className="card p-5">
        <h2 className="font-bold">Revenue — last 14 days</h2>
        <div className="mt-4 flex h-40 items-end gap-1.5">
          {stats.series.map((s) => (
            <div key={s.date} className="group relative flex-1">
              <div
                className="w-full rounded-t bg-brand-500 transition group-hover:bg-brand-700"
                style={{ height: `${Math.max(2, (s.revenue / max) * 152)}px` }}
              />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[11px] text-white group-hover:block">
                {s.date}: {money(s.revenue)}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-gray-400">
          <span>{stats.series[0]?.date}</span>
          <span>{stats.series[stats.series.length - 1]?.date}</span>
        </div>
      </div>

      {/* Quick counts + recent orders */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card space-y-3 p-5">
          <h2 className="font-bold">Store at a glance</h2>
          {[
            ['Orders', stats.counts.orders, '/admin/orders'],
            ['Products', stats.counts.products, '/admin/products'],
            ['Customers', stats.counts.users, '/admin/users'],
          ].map(([label, value, href]) => (
            <Link key={String(label)} href={String(href)} className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm hover:bg-gray-50">
              <span className="text-gray-600">{label}</span>
              <span className="font-bold">{Number(value).toLocaleString('en-US')}</span>
            </Link>
          ))}
        </div>
        <div className="card overflow-x-auto lg:col-span-2">
          <div className="flex items-center justify-between p-5 pb-0">
            <h2 className="font-bold">Recent orders</h2>
            <Link href="/admin/orders" className="text-sm font-semibold text-brand-600 hover:underline">View all →</Link>
          </div>
          <table className="mt-3 w-full min-w-[480px] text-sm">
            <tbody>
              {stats.recentOrders.map((o) => (
                <tr key={o.id} className="border-t border-gray-100">
                  <td className="px-5 py-2.5 font-mono text-xs">#{o.code}</td>
                  <td className="max-w-[160px] truncate px-2 py-2.5">{o.customer}</td>
                  <td className="max-w-[180px] truncate px-2 py-2.5 text-xs text-gray-500">{o.summary}</td>
                  <td className="px-2 py-2.5"><StatusBadge status={o.status} /></td>
                  <td className="px-5 py-2.5 text-right font-semibold">{money(o.total)}</td>
                </tr>
              ))}
              {stats.recentOrders.length === 0 && (
                <tr><td className="px-5 py-10 text-center text-gray-400">No orders yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
