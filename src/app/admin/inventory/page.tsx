'use client';

import { useCallback, useEffect, useState } from 'react';
import { useStore } from '@/components/Providers';
import { api } from '@/lib/client';
import Icon from '@/components/icons';

type Row = {
  packageId: number;
  productName: string;
  productSlug: string;
  packageName: string;
  autoDeliver: boolean;
  deliveryNote: string;
  lowStockAlert: number | null;
  available: number;
  soldTotal: number;
  sold30d: number;
};

type Summary = { autoPackages: number; unitsAvailable: number; lowStock: number; outOfStock: number; sold30d: number };

export default function AdminInventoryPage() {
  const { toast } = useStore();
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [open, setOpen] = useState<Row | null>(null);

  const load = useCallback(async () => {
    const d = await api<{ rows: Row[]; summary: Summary }>('/api/admin/inventory');
    setRows(d.rows);
    setSummary(d.summary);
    return d.rows;
  }, []);

  useEffect(() => { load().catch(() => {}); }, [load]);

  const toggleAuto = async (row: Row) => {
    try {
      await api('/api/admin/inventory', { method: 'PATCH', json: { packageId: row.packageId, autoDeliver: !row.autoDeliver } });
      toast(row.autoDeliver ? 'Auto-delivery turned off' : 'Auto-delivery turned on');
      await load();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  if (open) {
    return <PackageStockPanel row={open} onBack={async () => { const fresh = await load(); setOpen(null); void fresh; }} />;
  }

  const stockBadge = (r: Row) => {
    if (!r.autoDeliver) return <span className="badge bg-gray-100 text-gray-500">Manual</span>;
    if (r.available === 0) return <span className="badge bg-red-100 text-red-700">Out of stock</span>;
    if (r.lowStockAlert != null && r.available <= r.lowStockAlert) {
      return <span className="badge bg-amber-100 text-amber-700">Low — {r.available} left</span>;
    }
    return <span className="badge gap-1 bg-green-100 text-green-700"><Icon name="bolt" size={11} /> {r.available} in stock</span>;
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Auto delivery</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Stock pools per package. Paid orders pull from the pool instantly; the owner is emailed when stock runs low.
          </p>
        </div>
        <button className="btn-secondary" onClick={() => load()}><Icon name="refresh" size={16} /> Refresh</button>
      </div>

      {/* Summary */}
      {summary && (
        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-5">
          {([
            ['bolt', String(summary.autoPackages), 'Instant packages'],
            ['package', String(summary.unitsAvailable), 'Units in stock'],
            ['clock', String(summary.lowStock), 'Low stock'],
            ['x', String(summary.outOfStock), 'Out of stock'],
            ['check', String(summary.sold30d), 'Delivered (30d)'],
          ] as const).map(([icon, value, label]) => (
            <div key={label} className="card flex items-center gap-3 p-4">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                label === 'Out of stock' && summary.outOfStock > 0 ? 'bg-red-50 text-red-600'
                : label === 'Low stock' && summary.lowStock > 0 ? 'bg-amber-50 text-amber-600'
                : 'bg-brand-50 text-brand-600'
              }`}>
                <Icon name={icon} size={17} />
              </span>
              <span>
                <span className="block text-lg font-extrabold leading-tight">{value}</span>
                <span className="block text-xs text-gray-500">{label}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Package table */}
      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-400">
              <th className="px-4 py-3">Package</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Sold (30d)</th>
              <th className="px-4 py-3">Sold (all)</th>
              <th className="px-4 py-3">Alert at</th>
              <th className="px-4 py-3">Instant</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.packageId} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-semibold">{r.productName}</p>
                  <p className="text-xs text-gray-400">{r.packageName}</p>
                </td>
                <td className="px-4 py-3">{stockBadge(r)}</td>
                <td className="px-4 py-3">{r.sold30d}</td>
                <td className="px-4 py-3">{r.soldTotal}</td>
                <td className="px-4 py-3 text-gray-500">{r.lowStockAlert ?? '—'}</td>
                <td className="px-4 py-3">
                  <button
                    role="switch"
                    aria-checked={r.autoDeliver}
                    onClick={() => toggleAuto(r)}
                    className={`relative h-5.5 h-6 w-11 rounded-full transition ${r.autoDeliver ? 'bg-brand-600' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${r.autoDeliver ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setOpen(r)}>Manage stock</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No packages yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Per-package panel: add stock, settings, unsold list ──
function PackageStockPanel({ row, onBack }: { row: Row; onBack: () => void }) {
  const { toast } = useStore();
  const [items, setItems] = useState<any[]>([]);
  const [soldCount, setSoldCount] = useState(0);
  const [lines, setLines] = useState('');
  const [note, setNote] = useState(row.deliveryNote);
  const [alertAt, setAlertAt] = useState(row.lowStockAlert != null ? String(row.lowStockAlert) : '');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const d = await api<{ items: any[]; soldCount: number }>(`/api/admin/stock?packageId=${row.packageId}`);
    setItems(d.items);
    setSoldCount(d.soldCount);
  }, [row.packageId]);

  useEffect(() => { load().catch(() => {}); }, [load]);

  const addStock = async () => {
    setBusy(true);
    try {
      const d = await api<{ added: number; skippedDuplicates: number; available: number }>('/api/admin/stock', {
        method: 'POST',
        json: { packageId: row.packageId, lines },
      });
      toast(`Added ${d.added} unit${d.added === 1 ? '' : 's'}${d.skippedDuplicates ? ` · ${d.skippedDuplicates} duplicate${d.skippedDuplicates === 1 ? '' : 's'} skipped` : ''}`);
      setLines('');
      await load();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveSettings = async () => {
    setBusy(true);
    try {
      await api('/api/admin/inventory', {
        method: 'PATCH',
        json: { packageId: row.packageId, deliveryNote: note, lowStockAlert: alertAt === '' ? null : Number(alertAt) },
      });
      toast('Delivery settings saved');
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const removeItem = async (id: number) => {
    await api('/api/admin/stock', { method: 'DELETE', json: { id } });
    await load();
  };

  return (
    <div>
      <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-brand-600" onClick={onBack}>
        <Icon name="chevron-left" size={15} /> Auto delivery
      </button>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{row.productName} <span className="text-gray-400">·</span> {row.packageName}</h1>
        <span className="badge bg-gray-100 text-gray-600">{items.length} available · {soldCount} sold</span>
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        {/* Add stock */}
        <div className="card p-5">
          <h2 className="flex items-center gap-2 font-bold"><Icon name="package" size={17} className="text-brand-600" /> Add stock</h2>
          <p className="mt-1 text-xs text-gray-500">One license key / account per line. Duplicates already in the pool are skipped automatically.</p>
          <textarea className="input mt-3 font-mono text-xs" rows={6} value={lines} onChange={(e) => setLines(e.target.value)} placeholder={'KEY-AAAA-BBBB\nKEY-CCCC-DDDD'} />
          <button className="btn-primary mt-3" onClick={addStock} disabled={busy || !lines.trim()}>
            <Icon name="plus" size={15} /> Add to pool
          </button>
        </div>

        {/* Delivery settings */}
        <div className="card p-5">
          <h2 className="flex items-center gap-2 font-bold"><Icon name="settings" size={17} className="text-brand-600" /> Delivery settings</h2>
          <div className="mt-3 space-y-3">
            <div>
              <label className="label">Delivery note (appended below every delivered code)</label>
              <textarea className="input" rows={3} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)}
                placeholder={'How to activate:\n1. Open the app → Settings → License\n2. Paste your key'} />
            </div>
            <div>
              <label className="label">Low-stock email alert</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Email me when stock drops to</span>
                <input className="input w-20" type="number" min="0" placeholder="off" value={alertAt} onChange={(e) => setAlertAt(e.target.value)} />
                <span className="text-sm text-gray-500">units</span>
              </div>
              <p className="mt-1 text-xs text-gray-400">Sent to the support email in Site settings. Leave empty to disable.</p>
            </div>
            <button className="btn-primary" onClick={saveSettings} disabled={busy}>Save settings</button>
          </div>
        </div>
      </div>

      {/* Unsold pool */}
      <div className="card mt-5">
        <h2 className="border-b border-gray-100 p-4 text-sm font-bold">Unsold pool ({items.length})</h2>
        <div className="max-h-96 divide-y divide-gray-100 overflow-y-auto">
          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-3 px-4 py-2">
              <code className="min-w-0 flex-1 truncate font-mono text-xs">{it.content}</code>
              <span className="text-[11px] text-gray-400">{new Date(it.createdAt).toLocaleDateString('en-US')}</span>
              <button className="text-red-400 hover:text-red-600" onClick={() => removeItem(it.id)} aria-label="Remove">
                <Icon name="trash" size={14} />
              </button>
            </div>
          ))}
          {items.length === 0 && <p className="px-4 py-8 text-center text-sm text-gray-400">Pool is empty — add stock above.</p>}
        </div>
      </div>
    </div>
  );
}
