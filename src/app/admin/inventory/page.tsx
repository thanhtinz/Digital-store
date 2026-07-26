'use client';

import { useCallback, useEffect, useState } from 'react';
import { useStore } from '@/components/Providers';
import { api } from '@/lib/client';
import Icon from '@/components/icons';

type Row = {
  packageId: number;
  productId: number;
  productName: string;
  productImage: string | null;
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

// Drill-down: products with automatic packages → that product's packages →
// stock pool management for one package.
export default function AdminInventoryPage() {
  const { toast } = useStore();
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [productId, setProductId] = useState<number | null>(null);
  const [pkg, setPkg] = useState<Row | null>(null);

  const load = useCallback(async () => {
    const d = await api<{ rows: Row[]; summary: Summary }>('/api/admin/inventory');
    setRows(d.rows);
    setSummary(d.summary);
  }, []);

  useEffect(() => { load().catch(() => {}); }, [load]);

  const toggleAuto = async (row: Row) => {
    try {
      await api('/api/admin/inventory', { method: 'PATCH', json: { packageId: row.packageId, autoDeliver: !row.autoDeliver } });
      toast(row.autoDeliver ? 'Switched to manual delivery' : 'Automatic delivery enabled');
      await load();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  const stockBadge = (r: Row) => {
    if (!r.autoDeliver) return <span className="badge bg-gray-100 text-gray-500">Manual</span>;
    if (r.available === 0) return <span className="badge bg-red-100 text-red-700">Out of stock</span>;
    if (r.lowStockAlert != null && r.available <= r.lowStockAlert) {
      return <span className="badge bg-amber-100 text-amber-700">Low — {r.available} left</span>;
    }
    return <span className="badge gap-1 bg-green-100 text-green-700"><Icon name="bolt" size={11} /> {r.available} in stock</span>;
  };

  // ── Level 3: stock pool for one package ──
  if (pkg) {
    return <PackageStockPanel row={pkg} onBack={async () => { await load(); setPkg(null); }} />;
  }

  // ── Level 2: one product's packages ──
  if (productId != null) {
    const productRows = rows.filter((r) => r.productId === productId);
    const first = productRows[0];
    return (
      <div>
        <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-brand-600" onClick={() => setProductId(null)}>
          <Icon name="chevron-left" size={15} /> All products
        </button>
        <div className="mt-2 flex items-center gap-3">
          {first?.productImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={first.productImage} alt="" className="h-12 w-14 rounded-lg object-cover" />
          ) : (
            <span className="grid h-12 w-14 place-items-center rounded-lg bg-gray-100 text-gray-300"><Icon name="bag" size={22} /></span>
          )}
          <div>
            <h1 className="text-xl font-bold">{first?.productName}</h1>
            <p className="text-sm text-gray-500">Choose a package to manage its stock pool, note and alerts.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {productRows.map((r) => (
            <div key={r.packageId} className={`card p-5 ${r.autoDeliver ? '' : 'opacity-80'}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{r.packageName}</p>
                {stockBadge(r)}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {([
                  [String(r.available), 'In pool'],
                  [String(r.sold30d), 'Sold 30d'],
                  [r.lowStockAlert != null ? `≤ ${r.lowStockAlert}` : 'Off', 'Alert'],
                ] as const).map(([value, label]) => (
                  <div key={label} className="rounded-lg bg-gray-50 py-2">
                    <p className="text-sm font-extrabold">{value}</p>
                    <p className="text-[11px] text-gray-400">{label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
                  <button
                    role="switch"
                    aria-checked={r.autoDeliver}
                    onClick={() => toggleAuto(r)}
                    className={`relative h-6 w-11 rounded-full transition ${r.autoDeliver ? 'bg-brand-600' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${r.autoDeliver ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                  {r.autoDeliver ? 'Automatic' : 'Manual'}
                </label>
                {r.autoDeliver && (
                  <button className="btn-primary px-3 py-1.5 text-xs" onClick={() => setPkg(r)}>
                    <Icon name="package" size={14} /> Manage stock
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Level 1: products with automatic delivery ──
  const products = Array.from(
    rows.reduce((map, r) => {
      const entry = map.get(r.productId) || { rows: [] as Row[] };
      entry.rows.push(r);
      map.set(r.productId, entry);
      return map;
    }, new Map<number, { rows: Row[] }>())
  )
    .map(([id, { rows: pr }]) => {
      const auto = pr.filter((r) => r.autoDeliver);
      return {
        productId: id,
        name: pr[0].productName,
        image: pr[0].productImage,
        totalPackages: pr.length,
        autoCount: auto.length,
        available: auto.reduce((s, r) => s + r.available, 0),
        sold30d: auto.reduce((s, r) => s + r.sold30d, 0),
        low: auto.filter((r) => r.lowStockAlert != null && r.available <= r.lowStockAlert && r.available > 0).length,
        out: auto.filter((r) => r.available === 0).length,
      };
    })
    .filter((p) => p.autoCount > 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Auto delivery</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Products with automatic packages. Click a product, then a package, to manage its stock pool.
            The delivery method (manual / automatic) is chosen per package when creating the product.
          </p>
        </div>
        <button className="btn-secondary" onClick={() => load()}><Icon name="refresh" size={16} /> Refresh</button>
      </div>

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

      <div className="mt-4 space-y-3">
        {products.map((p) => (
          <button
            key={p.productId}
            className="card flex w-full items-center gap-4 p-4 text-left transition hover:border-brand-300 hover:shadow-md"
            onClick={() => setProductId(p.productId)}
          >
            {p.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image} alt="" className="h-14 w-16 shrink-0 rounded-lg object-cover" />
            ) : (
              <span className="grid h-14 w-16 shrink-0 place-items-center rounded-lg bg-gray-100 text-gray-300"><Icon name="bag" size={24} /></span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{p.name}</span>
              <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-gray-400">
                <span className="badge gap-1 bg-brand-50 text-brand-700"><Icon name="bolt" size={10} /> {p.autoCount}/{p.totalPackages} automatic</span>
                {p.out > 0 && <span className="badge bg-red-100 text-red-700">{p.out} out of stock</span>}
                {p.low > 0 && <span className="badge bg-amber-100 text-amber-700">{p.low} low</span>}
              </span>
            </span>
            <span className="hidden text-right sm:block">
              <span className="block text-lg font-extrabold">{p.available}</span>
              <span className="block text-xs text-gray-400">units in stock</span>
            </span>
            <span className="hidden text-right sm:block">
              <span className="block text-lg font-extrabold">{p.sold30d}</span>
              <span className="block text-xs text-gray-400">sold (30d)</span>
            </span>
            <Icon name="chevron-right" size={18} className="text-gray-300" />
          </button>
        ))}
        {products.length === 0 && (
          <div className="card p-14 text-center text-gray-400">
            <Icon name="bolt" size={44} className="mx-auto text-gray-300" />
            <p className="mt-3 font-semibold text-gray-600">No automatic packages yet</p>
            <p className="mt-1 text-sm">Edit a product and set a package&apos;s delivery method to “Automatic” — it will show up here.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stock pool management for one package (level 3) ──
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
      const d = await api<{ added: number; skippedDuplicates: number }>('/api/admin/stock', {
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
        <Icon name="chevron-left" size={15} /> {row.productName}
      </button>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{row.productName} <span className="text-gray-400">·</span> {row.packageName}</h1>
        <span className="badge bg-gray-100 text-gray-600">{items.length} available · {soldCount} sold</span>
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="flex items-center gap-2 font-bold"><Icon name="package" size={17} className="text-brand-600" /> Add stock</h2>
          <p className="mt-1 text-xs text-gray-500">One license key / account per line. Duplicates already in the pool are skipped automatically.</p>
          <textarea className="input mt-3 font-mono text-xs" rows={6} value={lines} onChange={(e) => setLines(e.target.value)} placeholder={'KEY-AAAA-BBBB\nKEY-CCCC-DDDD'} />
          <button className="btn-primary mt-3" onClick={addStock} disabled={busy || !lines.trim()}>
            <Icon name="plus" size={15} /> Add to pool
          </button>
        </div>

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
