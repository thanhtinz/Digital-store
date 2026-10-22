'use client';

import { useEffect, useState } from 'react';
import { ADMIN_INTL_LOCALE, useAdminT, useStore, useMoney } from '@/components/Providers';
import { api } from '@/lib/client';

const EMPTY = { id: 0, code: '', type: 'PERCENT', value: '', minOrder: '', maxDiscount: '', maxUses: '', perUserLimit: '', startsAt: '', endsAt: '', isActive: true };

export default function AdminCouponsPage() {
  const { toast } = useStore();
  const money = useMoney();
  const t = useAdminT();
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
      toast(t('admin.coupons.savedToast'));
      setForm(EMPTY);
      await load();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm(t('admin.coupons.deleteConfirm'))) return;
    await api(`/api/admin/coupons/${id}`, { method: 'DELETE' });
    await load();
  };

  const toLocal = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : '');

  return (
    <div>
      <h1 className="text-2xl font-bold">{t('admin.coupons.title')}</h1>
      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-400">
                <th className="px-4 py-3">{t('admin.coupons.colCode')}</th>
                <th className="px-4 py-3">{t('admin.coupons.colDiscount')}</th>
                <th className="px-4 py-3">{t('admin.coupons.colUsed')}</th>
                <th className="px-4 py-3">{t('admin.coupons.colWindow')}</th>
                <th className="px-4 py-3">{t('admin.products.colStatus')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-mono font-bold">{c.code}</td>
                  <td className="px-4 py-3">
                    {c.type === 'PERCENT' ? `${Number(c.value)}%` : money(Number(c.value))}
                    {c.minOrder && <span className="block text-xs text-gray-400">{t('admin.coupons.minOrder', { amount: money(Number(c.minOrder)) })}</span>}
                  </td>
                  <td className="px-4 py-3">{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ''}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {c.startsAt ? new Date(c.startsAt).toLocaleDateString(ADMIN_INTL_LOCALE) : '—'} → {c.endsAt ? new Date(c.endsAt).toLocaleDateString(ADMIN_INTL_LOCALE) : '∞'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>{c.isActive ? t('admin.products.active') : t('admin.coupons.off')}</span>
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
                    >{t('admin.products.edit')}</button>
                    <button className="text-xs text-red-500 hover:underline" onClick={() => remove(c.id)}>{t('admin.editor.delete')}</button>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">{t('admin.coupons.empty')}</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="card h-fit p-5">
          <h2 className="font-bold">{form.id ? t('admin.coupons.editTitle', { code: form.code }) : t('admin.coupons.newTitle')}</h2>
          <div className="mt-3 space-y-3">
            {!form.id && (
              <div><label className="label">{t('admin.coupons.code')}</label><input className="input uppercase" placeholder="WELCOME10" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">{t('admin.coupons.type')}</label>
                <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="PERCENT">{t('admin.coupons.typePercent')}</option>
                  <option value="FIXED">{t('admin.coupons.typeFixed')}</option>
                </select>
              </div>
              <div><label className="label">{t('admin.coupons.value')}</label><input className="input" type="number" min="0" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div>
              <div><label className="label">{t('admin.coupons.minOrderLabel')}</label><input className="input" type="number" value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value })} /></div>
              <div><label className="label">{t('admin.coupons.maxDiscountLabel')}</label><input className="input" type="number" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} /></div>
              <div><label className="label">{t('admin.coupons.maxUses')}</label><input className="input" type="number" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} /></div>
              <div><label className="label">{t('admin.coupons.perUserLimit')}</label><input className="input" type="number" value={form.perUserLimit} onChange={(e) => setForm({ ...form, perUserLimit: e.target.value })} /></div>
              <div><label className="label">{t('admin.coupons.starts')}</label><input className="input" type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></div>
              <div><label className="label">{t('admin.coupons.ends')}</label><input className="input" type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} /></div>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> {t('admin.products.active')}</label>
            <div className="flex gap-2">
              <button className="btn-primary flex-1" onClick={save} disabled={busy || (!form.id && !form.code.trim()) || !form.value}>
                {form.id ? t('admin.categories.update') : t('admin.categories.create')}
              </button>
              {form.id > 0 && <button className="btn-secondary" onClick={() => setForm(EMPTY)}>{t('admin.categories.newBtn')}</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
