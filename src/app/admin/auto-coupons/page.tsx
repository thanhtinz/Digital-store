'use client';

import { useEffect, useState } from 'react';
import { useAdminT, useStore, useMoney } from '@/components/Providers';
import { api } from '@/lib/client';
import Icon from '@/components/icons';

const EMPTY = {
  id: 0, name: '', trigger: 'ABANDONED_CART', delayHours: '24', inactiveDays: '30',
  minCartValue: '', minSpentTotal: '', discountType: 'PERCENT', value: '10',
  maxDiscount: '', expiresDays: '7', cooldownDays: '30', isActive: true,
};

// Automatic coupon campaigns: configurable triggers + conditions.
export default function AdminAutoCouponsPage() {
  const { toast } = useStore();
  const money = useMoney();
  const t = useAdminT();
  const [rules, setRules] = useState<any[]>([]);
  const [form, setForm] = useState<any>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [running, setRunning] = useState(false);

  const load = () => api<{ rules: any[] }>('/api/admin/auto-coupons').then((d) => setRules(d.rules));
  useEffect(() => { load().catch(() => {}); }, []);

  const save = async () => {
    setBusy(true);
    try {
      const payload = {
        name: form.name, trigger: form.trigger,
        delayHours: Number(form.delayHours), inactiveDays: Number(form.inactiveDays),
        minCartValue: form.minCartValue || null, minSpentTotal: form.minSpentTotal || null,
        discountType: form.discountType, value: Number(form.value),
        maxDiscount: form.maxDiscount || null,
        expiresDays: Number(form.expiresDays), cooldownDays: Number(form.cooldownDays),
        isActive: form.isActive,
      };
      if (form.id) await api(`/api/admin/auto-coupons/${form.id}`, { method: 'PATCH', json: payload });
      else await api('/api/admin/auto-coupons', { method: 'POST', json: payload });
      toast(t('admin.auto.savedToast'));
      setForm(EMPTY);
      await load();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const d = await api<{ granted: number }>('/api/admin/auto-coupons/run', { method: 'POST' });
      toast(t('admin.auto.runToast', { granted: d.granted }));
      await load();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setRunning(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm(t('admin.auto.deleteConfirm'))) return;
    await api(`/api/admin/auto-coupons/${id}`, { method: 'DELETE' });
    await load();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('admin.auto.title')}</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {t('admin.auto.subtitle')}
          </p>
        </div>
        <button className="btn-primary" onClick={runNow} disabled={running}>
          <Icon name="bolt" size={16} /> {running ? t('admin.auto.running') : t('admin.auto.runNow')}
        </button>
      </div>

      <div className="mt-4 grid gap-6 xl:grid-cols-[1fr_420px]">
        {/* Rules */}
        <div className="space-y-3">
          {rules.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold">
                    {r.name}
                    <span className={`badge ml-2 ${r.trigger === 'ABANDONED_CART' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      {r.trigger === 'ABANDONED_CART' ? t('admin.auto.triggerCart') : t('admin.auto.triggerWinback')}
                    </span>
                    {!r.isActive && <span className="badge ml-1 bg-gray-200 text-gray-500">{t('admin.coupons.off')}</span>}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {r.trigger === 'ABANDONED_CART'
                      ? <>{t('admin.auto.cartIdle', { hours: r.delayHours })}{r.minCartValue ? t('admin.auto.cartMin', { amount: money(Number(r.minCartValue)) }) : ''}</>
                      : <>{t('admin.auto.inactive', { days: r.inactiveDays })}{r.minSpentTotal ? t('admin.auto.spentMin', { amount: money(Number(r.minSpentTotal)) }) : ''}</>}
                    {' · '}
                    {r.discountType === 'FIXED' ? money(Number(r.value)) : `${Number(r.value)}%`}{t('admin.auto.offSuffix')}
                    {r.maxDiscount ? t('admin.auto.maxDiscount', { amount: money(Number(r.maxDiscount)) }) : ''}
                    {' · '}{t('admin.auto.expiresCooldown', { expires: r.expiresDays, cooldown: r.cooldownDays })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-right">
                    <span className="block text-lg font-extrabold">{r._count.grants}</span>
                    <span className="block text-[11px] text-gray-400">{t('admin.auto.codesSent')}</span>
                  </span>
                  <button
                    className="btn-secondary px-3 py-1.5 text-xs"
                    onClick={() => setForm({
                      id: r.id, name: r.name, trigger: r.trigger,
                      delayHours: String(r.delayHours), inactiveDays: String(r.inactiveDays),
                      minCartValue: r.minCartValue ? String(Number(r.minCartValue)) : '',
                      minSpentTotal: r.minSpentTotal ? String(Number(r.minSpentTotal)) : '',
                      discountType: r.discountType, value: String(Number(r.value)),
                      maxDiscount: r.maxDiscount ? String(Number(r.maxDiscount)) : '',
                      expiresDays: String(r.expiresDays), cooldownDays: String(r.cooldownDays),
                      isActive: r.isActive,
                    })}
                  >{t('admin.products.edit')}</button>
                  <button className="text-xs text-red-500 hover:underline" onClick={() => remove(r.id)}>{t('admin.editor.delete')}</button>
                </div>
              </div>
            </div>
          ))}
          {rules.length === 0 && (
            <div className="card p-12 text-center text-gray-400">
              <Icon name="ticket" size={40} className="mx-auto text-gray-300" />
              <p className="mt-3 font-semibold text-gray-600">{t('admin.auto.noneTitle')}</p>
              <p className="mt-1 text-sm">{t('admin.auto.noneText')}</p>
            </div>
          )}
        </div>

        {/* Rule form */}
        <div className="card h-fit p-5">
          <h2 className="font-bold">{form.id ? t('admin.auto.editTitle') : t('admin.auto.newTitle')}</h2>
          <div className="mt-3 space-y-3">
            <div>
              <label className="label">{t('admin.auto.ruleName')}</label>
              <input className="input" placeholder={t('admin.auto.ruleNamePlaceholder')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">{t('admin.auto.trigger')}</label>
              <select className="input" value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value })}>
                <option value="ABANDONED_CART">{t('admin.auto.triggerCartOpt')}</option>
                <option value="WINBACK">{t('admin.auto.triggerWinbackOpt')}</option>
              </select>
            </div>

            {/* Conditions per trigger */}
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{t('admin.auto.conditions')}</p>
              {form.trigger === 'ABANDONED_CART' ? (
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">{t('admin.auto.cartIdleLabel')}</label>
                    <input className="input" type="number" min="1" value={form.delayHours} onChange={(e) => setForm({ ...form, delayHours: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">{t('admin.auto.minCartLabel')}</label>
                    <input className="input" type="number" placeholder={t('admin.auto.any')} value={form.minCartValue} onChange={(e) => setForm({ ...form, minCartValue: e.target.value })} />
                  </div>
                </div>
              ) : (
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">{t('admin.auto.inactiveLabel')}</label>
                    <input className="input" type="number" min="1" value={form.inactiveDays} onChange={(e) => setForm({ ...form, inactiveDays: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">{t('admin.auto.minSpentLabel')}</label>
                    <input className="input" type="number" placeholder={t('admin.auto.any')} value={form.minSpentTotal} onChange={(e) => setForm({ ...form, minSpentTotal: e.target.value })} />
                  </div>
                </div>
              )}
            </div>

            {/* Discount */}
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{t('admin.auto.discount')}</p>
              <div className="mt-2 grid grid-cols-3 gap-3">
                <div>
                  <label className="label">{t('admin.coupons.type')}</label>
                  <select className="input" value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })}>
                    <option value="PERCENT">%</option>
                    <option value="FIXED">{t('admin.auto.fixedShort')}</option>
                  </select>
                </div>
                <div>
                  <label className="label">{t('admin.coupons.value')}</label>
                  <input className="input" type="number" min="0" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
                </div>
                <div>
                  <label className="label">{t('admin.coupons.maxDiscountLabel')}</label>
                  <input className="input" type="number" placeholder="—" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">{t('admin.auto.validDays')}</label>
                <input className="input" type="number" min="1" value={form.expiresDays} onChange={(e) => setForm({ ...form, expiresDays: e.target.value })} />
              </div>
              <div>
                <label className="label">{t('admin.auto.cooldownDays')}</label>
                <input className="input" type="number" min="1" value={form.cooldownDays} onChange={(e) => setForm({ ...form, cooldownDays: e.target.value })} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> {t('admin.products.active')}
            </label>
            <div className="flex gap-2">
              <button className="btn-primary flex-1" onClick={save} disabled={busy || !form.name.trim() || !Number(form.value)}>
                {form.id ? t('admin.auto.updateRule') : t('admin.auto.createRule')}
              </button>
              {form.id > 0 && <button className="btn-secondary" onClick={() => setForm(EMPTY)}>{t('admin.categories.newBtn')}</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
