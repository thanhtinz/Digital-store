'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/components/Providers';
import { api } from '@/lib/client';
import Icon from '@/components/icons';

export default function AdminCategoriesPage() {
  const { toast } = useStore();
  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState({ id: 0, name: '', slug: '', imageUrl: '', sortOrder: '0', isActive: true });
  const [busy, setBusy] = useState(false);

  const load = () => api<{ categories: any[] }>('/api/admin/categories').then((d) => setCategories(d.categories));
  useEffect(() => { load().catch(() => {}); }, []);

  const reset = () => setForm({ id: 0, name: '', slug: '', imageUrl: '', sortOrder: '0', isActive: true });

  const save = async () => {
    setBusy(true);
    try {
      const payload = { name: form.name, slug: form.slug || undefined, imageUrl: form.imageUrl, sortOrder: Number(form.sortOrder), isActive: form.isActive };
      if (form.id) await api(`/api/admin/categories/${form.id}`, { method: 'PATCH', json: payload });
      else await api('/api/admin/categories', { method: 'POST', json: payload });
      toast('Category saved');
      reset();
      await load();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this category?')) return;
    try {
      await api(`/api/admin/categories/${id}`, { method: 'DELETE' });
      await load();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Categories</h1>
      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="card divide-y divide-gray-100">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3">
              {c.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.imageUrl} alt="" className="h-9 w-9 rounded-lg object-cover" />
              ) : (
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-gray-100 text-gray-400"><Icon name="folder" size={18} /></span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{c.name} {!c.isActive && <span className="badge ml-1 bg-gray-200 text-gray-500">Hidden</span>}</p>
                <p className="text-xs text-gray-400">/{c.slug} · {c._count.products} products · order {c.sortOrder}</p>
              </div>
              <button
                className="btn-secondary px-3 py-1.5 text-xs"
                onClick={() => setForm({ id: c.id, name: c.name, slug: c.slug, imageUrl: c.imageUrl || '', sortOrder: String(c.sortOrder), isActive: c.isActive })}
              >
                Edit
              </button>
              <button className="text-xs text-red-500 hover:underline" onClick={() => remove(c.id)}>Delete</button>
            </div>
          ))}
          {categories.length === 0 && <p className="px-4 py-10 text-center text-sm text-gray-400">No categories yet.</p>}
        </div>

        <div className="card h-fit p-5">
          <h2 className="font-bold">{form.id ? 'Edit category' : 'New category'}</h2>
          <div className="mt-3 space-y-3">
            <div><label className="label">Name *</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="label">Slug</label><input className="input" placeholder="auto" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
            <div><label className="label">Image URL</label><input className="input" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} /></div>
            <div><label className="label">Sort order</label><input className="input" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>
            <div className="flex gap-2">
              <button className="btn-primary flex-1" onClick={save} disabled={busy || !form.name.trim()}>{form.id ? 'Update' : 'Create'}</button>
              {form.id > 0 && <button className="btn-secondary" onClick={reset}>New</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
