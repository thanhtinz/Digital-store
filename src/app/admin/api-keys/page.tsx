'use client';

import { useEffect, useState } from 'react';
import { ADMIN_INTL_LOCALE, useAdminT, useStore, useMoney } from '@/components/Providers';
import { api } from '@/lib/client';
import Icon from '@/components/icons';

type Key = {
  id: number;
  name: string;
  prefix: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  user: { email: string; name: string; balance: number };
};

export default function AdminApiKeysPage() {
  const { toast } = useStore();
  const money = useMoney();
  const t = useAdminT();
  const [keys, setKeys] = useState<Key[]>([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [newKey, setNewKey] = useState('');

  const load = () => api<{ keys: Key[] }>('/api/admin/api-keys').then((d) => setKeys(d.keys));
  useEffect(() => { load().catch(() => {}); }, []);

  const create = async () => {
    setBusy(true);
    try {
      const d = await api<{ key: string }>('/api/admin/api-keys', { method: 'POST', json: { email, name } });
      setNewKey(d.key);
      setEmail('');
      setName('');
      await load();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: number) => {
    if (!confirm(t('admin.apikeys.revokeConfirm'))) return;
    await api('/api/admin/api-keys', { method: 'DELETE', json: { id } });
    await load();
  };

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold">{t('admin.apikeys.title')}</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          {t('admin.apikeys.subtitle')}
        </p>
      </div>

      <div className="mt-4 grid gap-6 xl:grid-cols-[1fr_380px]">
        <div>
          {newKey && (
            <div className="card mb-4 border-green-200 bg-green-50/60 p-4">
              <p className="text-sm font-bold text-green-800">{t('admin.apikeys.createdNote')}</p>
              <div className="mt-2 flex gap-2">
                <input className="input flex-1 bg-white font-mono text-xs" readOnly value={newKey} onFocus={(e) => e.target.select()} />
                <button
                  className="btn-primary shrink-0"
                  onClick={async () => { await navigator.clipboard.writeText(newKey); toast(t('admin.apikeys.copiedToast')); }}
                >{t('admin.apikeys.copy')}</button>
                <button className="btn-secondary shrink-0" onClick={() => setNewKey('')}>{t('admin.apikeys.done')}</button>
              </div>
            </div>
          )}

          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-3">{t('admin.apikeys.colKey')}</th>
                  <th className="px-4 py-3">{t('admin.apikeys.colOwner')}</th>
                  <th className="px-4 py-3">{t('admin.apikeys.colWallet')}</th>
                  <th className="px-4 py-3">{t('admin.apikeys.colLastUsed')}</th>
                  <th className="px-4 py-3 text-right">{t('admin.posts.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                    <td className="px-4 py-2.5">
                      <p className="font-semibold">{k.name}</p>
                      <p className="font-mono text-xs text-gray-400">{k.prefix}_…</p>
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-2.5">{k.user.email}</td>
                    <td className="px-4 py-2.5 font-semibold">{money(k.user.balance)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-xs text-gray-500">
                      {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString(ADMIN_INTL_LOCALE, { dateStyle: 'medium', timeStyle: 'short' }) : t('admin.apikeys.never')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      {k.isActive
                        ? <button className="text-xs text-red-500 hover:underline" onClick={() => revoke(k.id)}>{t('admin.apikeys.revoke')}</button>
                        : <span className="badge bg-gray-100 text-gray-500">{t('admin.apikeys.revoked')}</span>}
                    </td>
                  </tr>
                ))}
                {keys.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                      <Icon name="key" size={36} className="mx-auto text-gray-300" />
                      <p className="mt-2">{t('admin.apikeys.empty')}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Quick docs */}
          <div className="card mt-4 p-5">
            <h2 className="font-bold">{t('admin.apikeys.quickRef')}</h2>
            <pre className="mt-3 overflow-x-auto rounded-xl bg-gray-900 p-4 text-xs leading-relaxed text-green-200">{`# Danh mục kèm giá & tồn kho trực tiếp
curl -H "Authorization: Bearer <KEY>" https://yourstore.com/api/v1/products

# Số dư ví
curl -H "Authorization: Bearer <KEY>" https://yourstore.com/api/v1/balance

# Đặt đơn (trả từ ví, sản phẩm giao ngay được trả về ngay trong phản hồi)
curl -X POST -H "Authorization: Bearer <KEY>" -H "Content-Type: application/json" \\
  -d '{"package_id": 1, "quantity": 2, "custom_fields": {"player_id": "ABC"}}' \\
  https://yourstore.com/api/v1/orders

# Kiểm tra một đơn hàng
curl -H "Authorization: Bearer <KEY>" https://yourstore.com/api/v1/orders/CODE`}</pre>
            <p className="mt-2 text-xs text-gray-400">{t('admin.apikeys.rateNote')}</p>
          </div>
        </div>

        {/* Create form */}
        <div className="card h-fit p-5">
          <h2 className="font-bold">{t('admin.apikeys.issueTitle')}</h2>
          <div className="mt-3 space-y-3">
            <div>
              <label className="label">{t('admin.apikeys.userEmail')}</label>
              <input className="input" type="email" placeholder="reseller@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              <p className="mt-1 text-xs text-gray-400">{t('admin.apikeys.userEmailHelp')}</p>
            </div>
            <div>
              <label className="label">{t('admin.apikeys.labelField')}</label>
              <input className="input" placeholder={t('admin.apikeys.labelPlaceholder')} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <button className="btn-primary w-full" onClick={create} disabled={busy || !email.trim()}>
              <Icon name="key" size={16} /> {busy ? t('admin.apikeys.creating') : t('admin.apikeys.create')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
