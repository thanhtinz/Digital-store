'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { useStore, useMoney } from '@/components/Providers';

import ProductEditor, { type EditableProduct } from './ProductEditor';
import Icon from '@/components/icons';

export default function AdminProductsPage() {
  const { toast } = useStore();
  const money = useMoney();
  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<EditableProduct | null | 'new'>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);

  const importCsv = async (file: File) => {
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/products/import', { method: 'POST', body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Import failed');
      toast(`Imported: ${d.createdProducts} new product(s), ${d.createdPackages} new + ${d.updatedPackages} updated package(s)${d.errors.length ? ` — ${d.errors.length} row error(s)` : ''}`);
      if (d.errors.length) console.warn('CSV import errors:', d.errors);
      await load();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setImporting(false);
    }
  };

  const load = useCallback(async () => {
    const d = await api<{ products: any[]; total: number }>(`/api/admin/products?page=${page}&q=${encodeURIComponent(q)}`);
    setProducts(d.products);
    setTotal(d.total);
  }, [page, q]);

  useEffect(() => { load().catch(() => {}); }, [load]);
  useEffect(() => {
    api<{ categories: any[] }>('/api/admin/categories').then((d) => setCategories(d.categories)).catch(() => {});
  }, []);

  if (editing) {
    return (
      <ProductEditor
        product={editing === 'new' ? null : editing}
        categories={categories}
        onClose={() => { setEditing(null); load().catch(() => {}); }}
      />
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Products <span className="text-sm font-normal text-gray-400">({total})</span></h1>
        <div className="flex flex-wrap gap-2">
          <input className="input w-48" placeholder="Search…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          <a href="/api/admin/products/export" className="btn-secondary">Export CSV</a>
          <label className="btn-secondary cursor-pointer">
            {importing ? 'Importing…' : 'Import CSV'}
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) importCsv(e.target.files[0]); e.target.value = ''; }}
            />
          </label>
          <button className="btn-primary" onClick={() => setEditing('new')}>+ New product</button>
        </div>
      </div>

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-400">
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Packages</th>
              <th className="px-4 py-3">Price from</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const prices = p.packages.filter((k: any) => k.isActive).map((k: any) => Number(k.price));
              const stock = p.packages.reduce((s: number, k: any) => s + (k._count?.stockItems ?? 0), 0);
              return (
                <tr key={p.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="h-10 w-12 shrink-0 overflow-hidden rounded-md bg-gray-100">
                        {p.images[0] && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.images[0].url} alt="" className="h-full w-full object-cover" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 font-semibold"><span className="line-clamp-1">{p.name}</span> {p.isFeatured && <Icon name="star" size={14} className="shrink-0 text-amber-500" />}</p>
                        <p className="text-xs text-gray-400">/{p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.category?.name || '—'}</td>
                  <td className="px-4 py-3">{p.packages.length}</td>
                  <td className="px-4 py-3 font-medium">{prices.length ? money(Math.min(...prices)) : '—'}</td>
                  <td className="px-4 py-3">{stock}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                      {p.isActive ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setEditing(p)}>Edit</button>
                  </td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No products yet — create your first one.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {total > 20 && (
        <div className="mt-4 flex justify-center gap-2">
          <button className="btn-secondary px-3 py-1.5" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
          <span className="px-3 py-1.5 text-sm text-gray-500">Page {page} / {Math.ceil(total / 20)}</span>
          <button className="btn-secondary px-3 py-1.5" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage((p) => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
