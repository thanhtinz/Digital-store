'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/components/Providers';
import { api } from '@/lib/client';
import type { CustomFieldDef } from '@/lib/utils';
import Icon from '@/components/icons';

export type EditableProduct = {
  id: number;
  name: string;
  slug: string;
  categoryId: number | null;
  shortDesc: string | null;
  description: string | null;
  guide: string | null;
  isActive: boolean;
  isFeatured: boolean;
  affiliateRate?: string | number | null;
  images: { url: string }[];
  packages: any[];
};

type PkgForm = {
  id?: number;
  name: string;
  description: string;
  price: string;
  comparePrice: string;
  autoDeliver: boolean;
  inStock: boolean;
  isActive: boolean;
  customFields: CustomFieldDef[];
  stockCount?: number;
};

export default function ProductEditor({ product, categories, onClose }: {
  product: EditableProduct | null;
  categories: Array<{ id: number; name: string }>;
  onClose: () => void;
}) {
  const { toast } = useStore();
  const [name, setName] = useState(product?.name || '');
  const [slug, setSlug] = useState(product?.slug || '');
  const [categoryId, setCategoryId] = useState<string>(product?.categoryId ? String(product.categoryId) : '');
  const [shortDesc, setShortDesc] = useState(product?.shortDesc || '');
  const [description, setDescription] = useState(product?.description || '');
  const [guide, setGuide] = useState(product?.guide || '');
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [isFeatured, setIsFeatured] = useState(product?.isFeatured ?? false);
  const [affiliateRate, setAffiliateRate] = useState(
    product?.affiliateRate !== null && product?.affiliateRate !== undefined ? String(Number(product.affiliateRate)) : ''
  );
  const [images, setImages] = useState<string[]>(product?.images.map((i) => i.url) || []);
  const [packages, setPackages] = useState<PkgForm[]>(
    product?.packages.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description || '',
      price: String(p.price),
      comparePrice: p.comparePrice ? String(p.comparePrice) : '',
      autoDeliver: p.autoDeliver,
      inStock: p.inStock !== false,
      isActive: p.isActive,
      customFields: Array.isArray(p.customFields) ? p.customFields : [],
      stockCount: p._count?.stockItems ?? 0,
    })) || [{ name: 'Standard', description: '', price: '', comparePrice: '', autoDeliver: false, inStock: true, isActive: true, customFields: [] }]
  );
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [stockFor, setStockFor] = useState<PkgForm | null>(null);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setImages((imgs) => [...imgs, data.url]);
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const updatePkg = (i: number, patch: Partial<PkgForm>) => {
    setPackages((pkgs) => pkgs.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  };

  const save = async () => {
    if (!name.trim()) { toast('Product name is required', 'error'); return; }
    if (!packages.length) { toast('Add at least one package', 'error'); return; }
    setBusy(true);
    try {
      const payload = {
        name, slug: slug || undefined, categoryId: categoryId ? Number(categoryId) : null,
        shortDesc, description, guide, isActive, isFeatured, affiliateRate, images,
        packages: packages.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: Number(p.price) || 0,
          comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
          autoDeliver: p.autoDeliver,
          inStock: p.inStock,
          isActive: p.isActive,
          customFields: p.customFields,
        })),
      };
      if (product) {
        await api(`/api/admin/products/${product.id}`, { method: 'PATCH', json: payload });
      } else {
        await api('/api/admin/products', { method: 'POST', json: payload });
      }
      toast('Product saved');
      onClose();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!product) return;
    if (!confirm('Delete this product? Products with orders are hidden instead of deleted.')) return;
    setBusy(true);
    try {
      await api(`/api/admin/products/${product.id}`, { method: 'DELETE' });
      toast('Product removed');
      onClose();
    } catch (e: any) {
      toast(e.message, 'error');
      setBusy(false);
    }
  };

  if (stockFor?.id) {
    return <StockManager pkg={stockFor} onBack={() => setStockFor(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{product ? 'Edit product' : 'New product'}</h1>
        <div className="flex gap-2">
          {product && <button className="btn-danger" onClick={remove} disabled={busy}>Delete</button>}
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save product'}</button>
        </div>
      </div>

      <div className="card grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <label className="label">Name *</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Slug (URL)</label>
          <input className="input" placeholder="auto-generated from name" value={slug} onChange={(e) => setSlug(e.target.value)} />
        </div>
        <div>
          <label className="label">Category</label>
          <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">— None —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex items-end gap-5 pb-1">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Active
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} /> Featured on homepage
          </label>
        </div>
        <div>
          <label className="label">Affiliate commission (%) — override</label>
          <input
            className="input"
            type="number"
            min="0"
            max="100"
            step="0.1"
            placeholder="Default (global rate)"
            value={affiliateRate}
            onChange={(e) => setAffiliateRate(e.target.value)}
          />
          <p className="mt-1 text-xs text-gray-400">Leave blank to use the global rate from Rewards &amp; affiliate.</p>
        </div>
        <div className="sm:col-span-2">
          <label className="label">Short description (shown in listings)</label>
          <input className="input" maxLength={500} value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Description (HTML allowed)</label>
          <textarea className="input font-mono text-xs" rows={6} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">How to use / activation guide (HTML allowed)</label>
          <textarea className="input font-mono text-xs" rows={4} value={guide} onChange={(e) => setGuide(e.target.value)} />
        </div>
      </div>

      {/* Images */}
      <div className="card p-5">
        <h2 className="font-bold">Images <span className="text-xs font-normal text-gray-400">(first image is the cover — up to 10)</span></h2>
        <div className="mt-3 flex flex-wrap gap-3">
          {images.map((url, i) => (
            <div key={i} className="group relative h-24 w-32 overflow-hidden rounded-lg border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 hidden items-center justify-center gap-1 bg-black/50 group-hover:flex">
                {i > 0 && (
                  <button
                    title="Move first"
                    className="rounded bg-white/90 px-1.5 py-0.5 text-xs"
                    onClick={() => setImages((imgs) => [imgs[i], ...imgs.filter((_, x) => x !== i)])}
                  ><Icon name="chevron-left" size={13} className="rotate-90" /></button>
                )}
                <button
                  title="Remove"
                  className="rounded bg-white/90 px-1.5 py-0.5 text-xs text-red-600"
                  onClick={() => setImages((imgs) => imgs.filter((_, x) => x !== i))}
                ><Icon name="x" size={13} /></button>
              </div>
            </div>
          ))}
          <label className="grid h-24 w-32 cursor-pointer place-items-center rounded-lg border-2 border-dashed border-gray-300 text-sm text-gray-400 hover:border-brand-400 hover:text-brand-600">
            {uploading ? '…' : '+ Upload'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
          </label>
        </div>
        <div className="mt-3 flex gap-2">
          <input
            className="input flex-1"
            placeholder="…or paste an image URL and press Add"
            id="img-url-input"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const v = (e.target as HTMLInputElement).value.trim();
                if (v) setImages((imgs) => [...imgs, v]);
                (e.target as HTMLInputElement).value = '';
              }
            }}
          />
        </div>
      </div>

      {/* Packages */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold">Packages & pricing</h2>
            <p className="mt-0.5 text-xs text-gray-500">Each package chooses its own delivery method. Automatic packages appear in Admin → Auto delivery where you manage their stock pools.</p>
          </div>
          <button
            className="btn-secondary px-3 py-1.5 text-xs"
            onClick={() => setPackages((p) => [...p, { name: `Package ${p.length + 1}`, description: '', price: '', comparePrice: '', autoDeliver: false, inStock: true, isActive: true, customFields: [] }])}
          >
            + Add package
          </button>
        </div>
        <div className="mt-4 space-y-4">
          {packages.map((pkg, i) => (
            <div key={i} className="rounded-xl border border-gray-200 p-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <div>
                  <label className="label">Package name</label>
                  <input className="input" value={pkg.name} onChange={(e) => updatePkg(i, { name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Price (USD)</label>
                  <input className="input" type="number" min="0" step="0.01" value={pkg.price} onChange={(e) => updatePkg(i, { price: e.target.value })} />
                </div>
                <div>
                  <label className="label">Compare-at price</label>
                  <input className="input" type="number" min="0" step="0.01" placeholder="optional" value={pkg.comparePrice} onChange={(e) => updatePkg(i, { comparePrice: e.target.value })} />
                </div>
                <div className="flex items-end gap-3 pb-1 text-sm">
                  <div className="flex-1">
                    <label className="label">Delivery method</label>
                    <select
                      className="input"
                      value={pkg.autoDeliver ? 'auto' : 'manual'}
                      onChange={(e) => updatePkg(i, { autoDeliver: e.target.value === 'auto' })}
                    >
                      <option value="manual">Manual — admin fulfills each order</option>
                      <option value="auto">Automatic — instant from stock pool</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-1.5 pb-2.5"><input type="checkbox" checked={pkg.isActive} onChange={(e) => updatePkg(i, { isActive: e.target.checked })} /> Active</label>
                </div>
                {!pkg.autoDeliver && (
                  <div className="sm:col-span-4">
                    <label className="label">Availability</label>
                    <select
                      className={`input ${!pkg.inStock ? 'border-red-300 bg-red-50 text-red-700' : ''}`}
                      value={pkg.inStock ? 'in' : 'out'}
                      onChange={(e) => updatePkg(i, { inStock: e.target.value === 'in' })}
                    >
                      <option value="in">In stock — customers can order</option>
                      <option value="out">Out of stock — hide buy button, collect restock alerts</option>
                    </select>
                    {!pkg.inStock && (
                      <p className="mt-1 text-xs text-gray-500">
                        Customers see an out-of-stock notice with a &quot;Notify me&quot; button. Switching back to in stock emails everyone on the waitlist automatically.
                      </p>
                    )}
                  </div>
                )}
                <div className="sm:col-span-4">
                  <label className="label">Short description</label>
                  <input className="input" value={pkg.description} onChange={(e) => updatePkg(i, { description: e.target.value })} />
                </div>
              </div>

              {/* Custom fields builder */}
              <div className="mt-3 rounded-lg bg-gray-50 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Checkout fields the buyer must fill (e.g. account email, game ID)
                  </p>
                  <button
                    className="text-xs font-semibold text-brand-600 hover:underline"
                    onClick={() => updatePkg(i, { customFields: [...pkg.customFields, { key: `field_${pkg.customFields.length + 1}`, label: '', type: 'text', required: true }] })}
                  >
                    + Add field
                  </button>
                </div>
                {pkg.customFields.map((f, fi) => (
                  <div key={fi} className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_110px_90px_auto]">
                    <input
                      className="input py-1.5 text-xs"
                      placeholder="key (no spaces)"
                      value={f.key}
                      onChange={(e) => {
                        const fields = [...pkg.customFields];
                        fields[fi] = { ...f, key: e.target.value.replace(/\s/g, '_').toLowerCase() };
                        updatePkg(i, { customFields: fields });
                      }}
                    />
                    <input
                      className="input py-1.5 text-xs"
                      placeholder="Label shown to buyer"
                      value={f.label}
                      onChange={(e) => {
                        const fields = [...pkg.customFields];
                        fields[fi] = { ...f, label: e.target.value };
                        updatePkg(i, { customFields: fields });
                      }}
                    />
                    <select
                      className="input py-1.5 text-xs"
                      value={f.type || 'text'}
                      onChange={(e) => {
                        const fields = [...pkg.customFields];
                        fields[fi] = { ...f, type: e.target.value as any };
                        updatePkg(i, { customFields: fields });
                      }}
                    >
                      <option value="text">Text</option>
                      <option value="email">Email</option>
                      <option value="number">Number</option>
                      <option value="textarea">Multiline</option>
                    </select>
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={f.required !== false}
                        onChange={(e) => {
                          const fields = [...pkg.customFields];
                          fields[fi] = { ...f, required: e.target.checked };
                          updatePkg(i, { customFields: fields });
                        }}
                      /> Required
                    </label>
                    <button
                      className="text-xs text-red-500 hover:underline"
                      onClick={() => updatePkg(i, { customFields: pkg.customFields.filter((_, x) => x !== fi) })}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between">
                {pkg.id && pkg.autoDeliver ? (
                  <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setStockFor(pkg)}>
                    <Icon name="package" size={15} /> Manage stock ({pkg.stockCount ?? 0} available)
                  </button>
                ) : <span className="text-xs text-gray-400">{pkg.autoDeliver && !pkg.id ? 'Save first, then add stock.' : ''}</span>}
                {packages.length > 1 && (
                  <button className="text-xs text-red-500 hover:underline" onClick={() => setPackages((p) => p.filter((_, x) => x !== i))}>
                    Remove package
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StockManager({ pkg, onBack }: { pkg: PkgForm; onBack: () => void }) {
  const { toast } = useStore();
  const [items, setItems] = useState<any[]>([]);
  const [soldCount, setSoldCount] = useState(0);
  const [lines, setLines] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const d = await api<{ items: any[]; soldCount: number }>(`/api/admin/stock?packageId=${pkg.id}`);
    setItems(d.items);
    setSoldCount(d.soldCount);
  };
  useEffect(() => { load().catch(() => {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const add = async () => {
    setBusy(true);
    try {
      const d = await api<{ added: number }>('/api/admin/stock', { method: 'POST', json: { packageId: pkg.id, lines } });
      toast(`Added ${d.added} item(s) to stock`);
      setLines('');
      await load();
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Stock — {pkg.name}</h1>
        <button className="btn-secondary" onClick={onBack}>← Back to product</button>
      </div>
      <div className="card p-5">
        <p className="text-sm text-gray-500">{items.length} available · {soldCount} sold</p>
        <label className="label mt-4">Add stock (one license key / account per line)</label>
        <textarea className="input font-mono text-xs" rows={5} value={lines} onChange={(e) => setLines(e.target.value)} placeholder={'KEY-AAAA-BBBB\nKEY-CCCC-DDDD'} />
        <button className="btn-primary mt-3" onClick={add} disabled={busy || !lines.trim()}>Add to stock</button>
      </div>
      <div className="card divide-y divide-gray-100">
        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-3 px-4 py-2.5">
            <code className="min-w-0 flex-1 truncate font-mono text-xs">{it.content}</code>
            <button className="text-xs text-red-500 hover:underline" onClick={() => removeItem(it.id)}>Remove</button>
          </div>
        ))}
        {items.length === 0 && <p className="px-4 py-8 text-center text-sm text-gray-400">No unsold stock.</p>}
      </div>
    </div>
  );
}
