'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/components/Providers';
import { api } from '@/lib/client';
import { formatMoney } from '@/lib/utils';
import Icon from '@/components/icons';

type ItemForm = { packageId: string; salePrice: string; quantityLimit: string; label?: string };
const EMPTY = { id: 0, name: '', startsAt: '', endsAt: '', isActive: true, items: [] as ItemForm[] };

export default function AdminFlashSalesPage() {
  const { toast } = useStore();
  const [sales, setSales] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [form, setForm] = useState<any>(EMPTY);
  const [busy, setBusy] = useState(false);

  const load = () => api<{ sales: any[] }>('/api/admin/flash-sales').then((d) => setSales(d.sales));
  useEffect(() => {
    load().catch(() => {});
    // Load all products (first pages) for the package picker.
    api<{ products: any[] }>('/api/admin/products?page=1').then((d) => setProducts(d.products)).catch(() => {});
  }, []);

  const allPackages = products.flatMap((p) =>
    p.packages.map((k: any) => ({ id: k.id, label: `${p.name} — ${k.name} (${formatMoney(Number(k.price))})` }))
  );

  const save = async () => {
    setBusy(true);
    try {
      const payload = {
        name: form.name,
        startsAt: form.startsAt,
        endsAt: form.endsAt,
        isActive: form.isActive,
        items: form.items
          .filter((i: ItemForm) => i.packageId && i.salePrice)
          .map((i: ItemForm) => ({ packageId: Number(i.packageId), salePrice: Number(i.salePrice), quantityLimit: i.quantityLimit || null })),
      };
      if (form.id) await api(`/api/admin/flash-sales/${form.id}`, { method: 'PATCH', json: payload });
      else await api('/api/admin/flash-sales', { method: 'POST', json: payload });
      toast('Flash sale saved');
      setForm(EMPTY);
      await load();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this flash sale?')) return;
    await api(`/api/admin/flash-sales/${id}`, { method: 'DELETE' });
    await load();
  };

  const toLocal = (iso: string) => new Date(iso).toISOString().slice(0, 16);

  return (
    <div>
      <h1 className="text-2xl font-bold">Flash sales</h1>
      <div className="mt-4 grid gap-6 xl:grid-cols-[1fr_400px]">
        <div className="space-y-3">
          {sales.map((s) => {
            const live = s.isActive && new Date(s.startsAt) <= new Date() && new Date(s.endsAt) >= new Date();
            return (
              <div key={s.id} className="card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold">
                      {s.name}
                      {live && <span className="badge ml-2 gap-1 bg-red-100 text-red-700"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-600" /> LIVE</span>}
                      {!s.isActive && <span className="badge ml-2 bg-gray-200 text-gray-500">Off</span>}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(s.startsAt).toLocaleString('en-US')} → {new Date(s.endsAt).toLocaleString('en-US')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn-secondary px-3 py-1.5 text-xs"
                      onClick={() => setForm({
                        id: s.id, name: s.name, startsAt: toLocal(s.startsAt), endsAt: toLocal(s.endsAt), isActive: s.isActive,
                        items: s.items.map((i: any) => ({ packageId: String(i.packageId), salePrice: String(Number(i.salePrice)), quantityLimit: i.quantityLimit ? String(i.quantityLimit) : '' })),
                      })}
                    >Edit</button>
                    <button className="text-xs text-red-500 hover:underline" onClick={() => remove(s.id)}>Delete</button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                  {s.items.map((i: any) => (
                    <span key={i.id} className="rounded-full bg-gray-100 px-2.5 py-1">
                      {i.package?.product?.name} · {i.package?.name}: <b className="text-red-600">{formatMoney(Number(i.salePrice))}</b>
                      {i.quantityLimit != null && ` (${i.soldCount}/${i.quantityLimit})`}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
          {sales.length === 0 && <div className="card p-10 text-center text-sm text-gray-400">No flash sales yet.</div>}
        </div>

        <div className="card h-fit p-5">
          <h2 className="font-bold">{form.id ? 'Edit flash sale' : 'New flash sale'}</h2>
          <div className="mt-3 space-y-3">
            <div><label className="label">Name *</label><input className="input" placeholder="Weekend deals" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Starts *</label><input className="input" type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></div>
              <div><label className="label">Ends *</label><input className="input" type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} /></div>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>

            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Discounted packages</p>
              <button className="text-xs font-semibold text-brand-600 hover:underline" onClick={() => setForm({ ...form, items: [...form.items, { packageId: '', salePrice: '', quantityLimit: '' }] })}>
                + Add
              </button>
            </div>
            {form.items.map((item: ItemForm, i: number) => (
              <div key={i} className="space-y-2 rounded-lg bg-gray-50 p-3">
                <select
                  className="input py-1.5 text-xs"
                  value={item.packageId}
                  onChange={(e) => {
                    const items = [...form.items];
                    items[i] = { ...item, packageId: e.target.value };
                    setForm({ ...form, items });
                  }}
                >
                  <option value="">— Choose a package —</option>
                  {allPackages.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
                <div className="flex gap-2">
                  <input className="input py-1.5 text-xs" type="number" step="0.01" placeholder="Sale price $" value={item.salePrice}
                    onChange={(e) => { const items = [...form.items]; items[i] = { ...item, salePrice: e.target.value }; setForm({ ...form, items }); }} />
                  <input className="input py-1.5 text-xs" type="number" placeholder="Qty limit (opt)" value={item.quantityLimit}
                    onChange={(e) => { const items = [...form.items]; items[i] = { ...item, quantityLimit: e.target.value }; setForm({ ...form, items }); }} />
                  <button className="text-red-500" onClick={() => setForm({ ...form, items: form.items.filter((_: any, x: number) => x !== i) })}><Icon name="x" size={14} /></button>
                </div>
              </div>
            ))}

            <div className="flex gap-2">
              <button className="btn-primary flex-1" onClick={save} disabled={busy || !form.name || !form.startsAt || !form.endsAt}>
                {form.id ? 'Update' : 'Create'}
              </button>
              {form.id > 0 && <button className="btn-secondary" onClick={() => setForm(EMPTY)}>New</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
