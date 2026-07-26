'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/components/Providers';
import { api } from '@/lib/client';

export default function AdminBannersPage() {
  const { toast } = useStore();
  const [banners, setBanners] = useState<any[]>([]);
  const [form, setForm] = useState({ id: 0, title: '', subtitle: '', imageUrl: '', linkUrl: '', sortOrder: '0', isActive: true });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = () => api<{ banners: any[] }>('/api/admin/banners').then((d) => setBanners(d.banners));
  useEffect(() => { load().catch(() => {}); }, []);

  const reset = () => setForm({ id: 0, title: '', subtitle: '', imageUrl: '', linkUrl: '', sortOrder: '0', isActive: true });

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setForm((f) => ({ ...f, imageUrl: data.url }));
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.imageUrl) { toast('Banner image is required', 'error'); return; }
    setBusy(true);
    try {
      const payload = { title: form.title, subtitle: form.subtitle, imageUrl: form.imageUrl, linkUrl: form.linkUrl, sortOrder: Number(form.sortOrder), isActive: form.isActive };
      if (form.id) await api(`/api/admin/banners/${form.id}`, { method: 'PATCH', json: payload });
      else await api('/api/admin/banners', { method: 'POST', json: payload });
      toast('Banner saved');
      reset();
      await load();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this banner?')) return;
    await api(`/api/admin/banners/${id}`, { method: 'DELETE' });
    await load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Homepage banners</h1>
      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          {banners.map((b) => (
            <div key={b.id} className="card flex items-center gap-4 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.imageUrl} alt="" className="h-16 w-32 shrink-0 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{b.title || <span className="text-gray-400">No title</span>}</p>
                <p className="truncate text-xs text-gray-400">{b.linkUrl || 'No link'} · order {b.sortOrder}</p>
                {!b.isActive && <span className="badge mt-1 bg-gray-200 text-gray-500">Hidden</span>}
              </div>
              <button
                className="btn-secondary px-3 py-1.5 text-xs"
                onClick={() => setForm({ id: b.id, title: b.title || '', subtitle: b.subtitle || '', imageUrl: b.imageUrl, linkUrl: b.linkUrl || '', sortOrder: String(b.sortOrder), isActive: b.isActive })}
              >
                Edit
              </button>
              <button className="text-xs text-red-500 hover:underline" onClick={() => remove(b.id)}>Delete</button>
            </div>
          ))}
          {banners.length === 0 && <div className="card p-10 text-center text-sm text-gray-400">No banners yet — create one to light up the homepage.</div>}
        </div>

        <div className="card h-fit p-5">
          <h2 className="font-bold">{form.id ? 'Edit banner' : 'New banner'}</h2>
          <div className="mt-3 space-y-3">
            <div>
              <label className="label">Image * <span className="text-xs font-normal text-gray-400">(recommended 1600×500)</span></label>
              {form.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.imageUrl} alt="" className="mb-2 h-24 w-full rounded-lg object-cover" />
              )}
              <div className="flex gap-2">
                <label className="btn-secondary flex-1 cursor-pointer text-xs">
                  {uploading ? 'Uploading…' : 'Upload image'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                </label>
              </div>
              <input className="input mt-2" placeholder="…or paste image URL" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
            </div>
            <div><label className="label">Title</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><label className="label">Subtitle</label><input className="input" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></div>
            <div><label className="label">Link URL</label><input className="input" placeholder="/products or https://…" value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} /></div>
            <div><label className="label">Sort order</label><input className="input" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>
            <div className="flex gap-2">
              <button className="btn-primary flex-1" onClick={save} disabled={busy}>{form.id ? 'Update' : 'Create'}</button>
              {form.id > 0 && <button className="btn-secondary" onClick={reset}>New</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
