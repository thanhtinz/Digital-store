'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/components/Providers';
import { api } from '@/lib/client';
import { formatMoney } from '@/lib/utils';

const EMPTY = { id: 0, code: '', type: 'PERCENT', value: '', minOrder: '', maxDiscount: '', maxUses: '', perUserLimit: '', startsAt: '', endsAt: '', isActive: true };

export default function AdminCouponsPage() {
  const { toast } = useStore();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [form, setForm] = useState<any>(EMPTY);
  const [busy, setBusy] = useState(false);

  const load = () => api<{ coupons: any[] }>('/api/admin/coupons').then((d) => setCoupons(d.coupons));
  useEffect(() => { load().catch(() => {}); }, []);

  const save = async () => {
    setBusy(true);
    try {
      const payload = {
        code: form.code,
        type: form.type,
        value: Number(form.value),
        minOrder: form.minOrder || null,
        maxDiscount: form.maxDiscount || null,
        maxUses: form.maxUses || null,
        perUserLimit: form.perUserLimit || null,
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
        isActive: form.isActive,
      };
      if (form.id) await api(`/api/admin/coupons/${form.id}`, { method: 'PATCH', json: payload });
      else await api('/api/admin/coupons', { method: 'POST', json: payload });
      toast('Coupon saved');
      setForm(EMPTY);
      await load();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this coupon?')) return;
    await api(`/api/admin/coupons/${id}`, { method: 'DELETE' });
    await load();
  };

  const toLocal = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : '');

  return (
    <div>
      <h1 className="text-2xl font-bold">Coupons</h1>
      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-400">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Used</th>
                <th className="px-4 py-3">Window</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-mono font-bold">{c.code}</td>
                  <td className="px-4 py-3">
                    {c.type === 'PERCENT' ? `${Number(c.value)}%` : formatMoney(Number(c.value))}
                    {c.minOrder && <span className="block text-xs text-gray-400">min {formatMoney(Number(c.minOrder))}</span>}
                  </td>
                  <td className="px-4 py-3">{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ''}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {c.startsAt ? new Date(c.startsAt).toLocaleDateString('en-US') : '—'} → {c.endsAt ? new Date(c.endsAt).toLocaleDateString('en-US') : '∞'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>{c.isActive ? 'Active' : 'Off'}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="btn-secondary mr-2 px-3 py-1.5 text-xs"
                      onClick={() => setForm({
                        id: c.id, code: c.code, type: c.type, value: String(Number(c.value)),
                        minOrder: c.minOrder ? String(Number(c.minOrder)) : '', maxDiscount: c.maxDiscount ? String(Number(c.maxDiscount)) : '',
                        maxUses: c.maxUses ? String(c.maxUses) : '', perUserLimit: c.perUserLimit ? String(c.perUserLimit) : '',
                        startsAt: toLocal(c.startsAt), endsAt: toLocal(c.endsAt), isActive: c.isActive,
                      })}
                    >Edit</button>
                    <button className="text-xs text-red-500 hover:underline" onClick={() => remove(c.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No coupons yet.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="card h-fit p-5">
          <h2 className="font-bold">{form.id ? `Edit ${form.code}` : 'New coupon'}</h2>
          <div className="mt-3 space-y-3">
            {!form.id && (
              <div><label className="label">Code *</label><input className="input uppercase" placeholder="WELCOME10" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Type</label>
                <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="PERCENT">Percent (%)</option>
                  <option value="FIXED">Fixed ($)</option>
                </select>
              </div>
              <div><label className="label">Value *</label><input className="input" type="number" min="0" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div>
              <div><label className="label">Min order ($)</label><input className="input" type="number" value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value })} /></div>
              <div><label className="label">Max discount ($)</label><input className="input" type="number" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} /></div>
              <div><label className="label">Max total uses</label><input className="input" type="number" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} /></div>
              <div><label className="label">Per-user limit</label><input className="input" type="number" value={form.perUserLimit} onChange={(e) => setForm({ ...form, perUserLimit: e.target.value })} /></div>
              <div><label className="label">Starts</label><input className="input" type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></div>
              <div><label className="label">Ends</label><input className="input" type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} /></div>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>
            <div className="flex gap-2">
              <button className="btn-primary flex-1" onClick={save} disabled={busy || (!form.id && !form.code.trim()) || !form.value}>
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
