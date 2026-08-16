'use client';

import { useEffect, useState } from 'react';
import { useStore, useMoney } from '@/components/Providers';
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
    if (!confirm('Revoke this key? Integrations using it will stop working immediately.')) return;
    await api('/api/admin/api-keys', { method: 'DELETE', json: { id } });
    await load();
  };

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold">API keys</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Reseller access to the store: keys call /api/v1 endpoints and orders are paid from the key owner&apos;s wallet balance.
        </p>
      </div>

      <div className="mt-4 grid gap-6 xl:grid-cols-[1fr_380px]">
        <div>
          {newKey && (
            <div className="card mb-4 border-green-200 bg-green-50/60 p-4">
              <p className="text-sm font-bold text-green-800">Key created — copy it now, it will not be shown again:</p>
              <div className="mt-2 flex gap-2">
                <input className="input flex-1 bg-white font-mono text-xs" readOnly value={newKey} onFocus={(e) => e.target.select()} />
                <button
                  className="btn-primary shrink-0"
                  onClick={async () => { await navigator.clipboard.writeText(newKey); toast('Key copied'); }}
                >Copy</button>
                <button className="btn-secondary shrink-0" onClick={() => setNewKey('')}>Done</button>
              </div>
            </div>
          )}

          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-3">Key</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Wallet</th>
                  <th className="px-4 py-3">Last used</th>
                  <th className="px-4 py-3 text-right">Actions</th>
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
                      {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'Never'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      {k.isActive
                        ? <button className="text-xs text-red-500 hover:underline" onClick={() => revoke(k.id)}>Revoke</button>
                        : <span className="badge bg-gray-100 text-gray-500">Revoked</span>}
                    </td>
                  </tr>
                ))}
                {keys.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                      <Icon name="key" size={36} className="mx-auto text-gray-300" />
                      <p className="mt-2">No API keys yet.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Quick docs */}
          <div className="card mt-4 p-5">
            <h2 className="font-bold">Quick reference</h2>
            <pre className="mt-3 overflow-x-auto rounded-xl bg-gray-900 p-4 text-xs leading-relaxed text-green-200">{`# Catalog with live prices & stock
curl -H "Authorization: Bearer <KEY>" https://yourstore.com/api/v1/products

# Wallet balance
curl -H "Authorization: Bearer <KEY>" https://yourstore.com/api/v1/balance

# Place an order (paid from wallet, instant items returned inline)
curl -X POST -H "Authorization: Bearer <KEY>" -H "Content-Type: application/json" \\
  -d '{"package_id": 1, "quantity": 2, "custom_fields": {"player_id": "ABC"}}' \\
  https://yourstore.com/api/v1/orders

# Check an order
curl -H "Authorization: Bearer <KEY>" https://yourstore.com/api/v1/orders/CODE`}</pre>
            <p className="mt-2 text-xs text-gray-400">Rate limit: 120 requests/minute per key. Resellers top up their wallet on the storefront.</p>
          </div>
        </div>

        {/* Create form */}
        <div className="card h-fit p-5">
          <h2 className="font-bold">Issue a new key</h2>
          <div className="mt-3 space-y-3">
            <div>
              <label className="label">User email *</label>
              <input className="input" type="email" placeholder="reseller@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              <p className="mt-1 text-xs text-gray-400">The reseller must already have an account. Orders draw from their wallet.</p>
            </div>
            <div>
              <label className="label">Label</label>
              <input className="input" placeholder="e.g. Reseller — GameShop EU" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <button className="btn-primary w-full" onClick={create} disabled={busy || !email.trim()}>
              <Icon name="key" size={16} /> {busy ? 'Creating…' : 'Create key'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
