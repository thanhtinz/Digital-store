'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client';

import StatusBadge from '@/components/StatusBadge';
import Icon from '@/components/icons';
import { ADMIN_INTL_LOCALE, useAdminT, useMoney } from '@/components/Providers';
import { useAutoRefresh } from './useAutoRefresh';

type Stats = {
  revenue: { total: number; month: number; today: number };
  counts: { orders: number; awaitingDelivery: number; users: number; products: number };
  series: { date: string; revenue: number }[];
  recentOrders: { id: number; code: string; total: number; status: string; customer: string; summary: string; createdAt: string }[];
};

export default function AdminDashboard() {
  const money = useMoney();
  const t = useAdminT();
  const [stats, setStats] = useState<Stats | null>(null);
  const [hasNew, setHasNew] = useState(false);
  const newestId = useRef<number | null>(null);

  // Poll /api/admin/stats: fresh KPIs, chart and recent orders land without
  // a manual reload (see useAutoRefresh). When a newer order appears than
  // the newest one already shown, flag it with a "Có đơn mới" badge until
  // the admin opens the orders page.
  const load = useCallback(async () => {
    try {
      const s = await api<Stats>('/api/admin/stats');
      const newest = s.recentOrders[0]?.id ?? null;
      if (newestId.current !== null && newest !== null && newest > newestId.current) setHasNew(true);
      if (newest !== null) newestId.current = newest;
      setStats(s);
    } catch { /* keep showing the last good data */ }
  }, []);

  useEffect(() => { void load(); }, [load]);
  const lastUpdated = useAutoRefresh(load);

  if (!stats) return <div className="py-16 text-center text-gray-400">{t('admin.dashboard.loading')}</div>;

  const max = Math.max(1, ...stats.series.map((s) => s.revenue));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{t('admin.dashboard.title')}</h1>
        {hasNew && (
          <Link href="/admin/orders" className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white shadow-btn-primary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            {t('admin.dashboard.newOrders')}
          </Link>
        )}
        {lastUpdated && (
          <span className="ml-auto text-xs text-gray-400">
            {t('admin.shell.lastUpdated', { time: lastUpdated.toLocaleTimeString(ADMIN_INTL_LOCALE) })}
          </span>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {([
          ['clock', t('admin.dashboard.revenueToday'), money(stats.revenue.today), ''],
          ['dashboard', t('admin.dashboard.revenueMonth'), money(stats.revenue.month), ''],
          ['credit-card', t('admin.dashboard.revenueTotal'), money(stats.revenue.total), ''],
          ['truck', t('admin.dashboard.awaitingDelivery'), String(stats.counts.awaitingDelivery), '/admin/deliveries'],
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
        <h2 className="font-bold">{t('admin.dashboard.revenue14')}</h2>
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
          <h2 className="font-bold">{t('admin.dashboard.glance')}</h2>
          {[
            [t('admin.nav.orders'), stats.counts.orders, '/admin/orders'],
            [t('admin.nav.products'), stats.counts.products, '/admin/products'],
            [t('admin.dashboard.customers'), stats.counts.users, '/admin/users'],
          ].map(([label, value, href]) => (
            <Link key={String(label)} href={String(href)} className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm hover:bg-gray-50">
              <span className="text-gray-600">{label}</span>
              <span className="font-bold">{Number(value).toLocaleString(ADMIN_INTL_LOCALE)}</span>
            </Link>
          ))}
        </div>
        <div className="card overflow-x-auto lg:col-span-2">
          <div className="flex items-center justify-between p-5 pb-0">
            <h2 className="font-bold">{t('admin.dashboard.recentOrders')}</h2>
            <Link href="/admin/orders" className="text-sm font-semibold text-brand-600 hover:underline">{t('admin.dashboard.viewAll')}</Link>
          </div>
          <table className="mt-3 w-full min-w-[480px] text-sm">
            <tbody>
              {stats.recentOrders.map((o) => (
                <tr key={o.id} className="border-t border-gray-100">
                  <td className="px-5 py-2.5 font-mono text-xs">#{o.code}</td>
                  <td className="max-w-[160px] truncate px-2 py-2.5">{o.customer}</td>
                  <td className="max-w-[180px] truncate px-2 py-2.5 text-xs text-gray-500">{o.summary}</td>
                  <td className="px-2 py-2.5"><StatusBadge status={o.status} label={t(`admin.status.${o.status}`)} /></td>
                  <td className="px-5 py-2.5 text-right font-semibold">{money(o.total)}</td>
                </tr>
              ))}
              {stats.recentOrders.length === 0 && (
                <tr><td className="px-5 py-10 text-center text-gray-400">{t('admin.dashboard.noOrders')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
