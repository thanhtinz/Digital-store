'use client';

import { useEffect, useState } from 'react';
import { useAdminT, useStore } from '@/components/Providers';
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
  const t = useAdminT();
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
    })) || [{ name: t('admin.editor.defaultPackage'), description: '', price: '', comparePrice: '', autoDeliver: false, inStock: true, isActive: true, customFields: [] }]
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
      if (!res.ok) throw new Error(data.error || t('admin.editor.uploadFailed'));
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
    if (!name.trim()) { toast(t('admin.editor.nameRequired'), 'error'); return; }
    if (!packages.length) { toast(t('admin.editor.packageRequired'), 'error'); return; }
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
      toast(t('admin.editor.savedToast'));
      onClose();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!product) return;
    if (!confirm(t('admin.editor.deleteConfirm'))) return;
    setBusy(true);
    try {
      await api(`/api/admin/products/${product.id}`, { method: 'DELETE' });
      toast(t('admin.editor.removedToast'));
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
        <h1 className="text-2xl font-bold">{product ? t('admin.editor.editTitle') : t('admin.editor.newTitle')}</h1>
        <div className="flex gap-2">
          {product && <button className="btn-danger" onClick={remove} disabled={busy}>{t('admin.editor.delete')}</button>}
          <button className="btn-secondary" onClick={onClose}>{t('admin.editor.cancel')}</button>
          <button className="btn-primary" onClick={save} disabled={busy}>{busy ? t('admin.common.saving') : t('admin.editor.save')}</button>
        </div>
      </div>

      <div className="card grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <label className="label">{t('admin.editor.name')}</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">{t('admin.editor.slug')}</label>
          <input className="input" placeholder={t('admin.editor.slugPlaceholder')} value={slug} onChange={(e) => setSlug(e.target.value)} />
        </div>
        <div>
          <label className="label">{t('admin.editor.category')}</label>
          <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">{t('admin.editor.none')}</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex items-end gap-5 pb-1">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> {t('admin.products.active')}
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} /> {t('admin.editor.featured')}
          </label>
        </div>
        <div>
          <label className="label">{t('admin.editor.affiliateRate')}</label>
          <input
            className="input"
            type="number"
            min="0"
            max="100"
            step="0.1"
            placeholder={t('admin.editor.affiliateRatePlaceholder')}
            value={affiliateRate}
            onChange={(e) => setAffiliateRate(e.target.value)}
          />
          <p className="mt-1 text-xs text-gray-400">{t('admin.editor.affiliateRateHelp')}</p>
        </div>
        <div className="sm:col-span-2">
          <label className="label">{t('admin.editor.shortDesc')}</label>
          <input className="input" maxLength={500} value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">{t('admin.editor.description')}</label>
          <textarea className="input font-mono text-xs" rows={6} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">{t('admin.editor.guide')}</label>
          <textarea className="input font-mono text-xs" rows={4} value={guide} onChange={(e) => setGuide(e.target.value)} />
        </div>
      </div>

      {/* Images */}
      <div className="card p-5">
        <h2 className="font-bold">{t('admin.editor.images')} <span className="text-xs font-normal text-gray-400">{t('admin.editor.imagesHelp')}</span></h2>
        <div className="mt-3 flex flex-wrap gap-3">
          {images.map((url, i) => (
            <div key={i} className="group relative h-24 w-32 overflow-hidden rounded-lg border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 hidden items-center justify-center gap-1 bg-black/50 group-hover:flex">
                {i > 0 && (
                  <button
                    title={t('admin.editor.moveFirst')}
                    className="rounded bg-white/90 px-1.5 py-0.5 text-xs"
                    onClick={() => setImages((imgs) => [imgs[i], ...imgs.filter((_, x) => x !== i)])}
                  ><Icon name="chevron-left" size={13} className="rotate-90" /></button>
                )}
                <button
                  title={t('admin.editor.removeTitle')}
                  className="rounded bg-white/90 px-1.5 py-0.5 text-xs text-red-600"
                  onClick={() => setImages((imgs) => imgs.filter((_, x) => x !== i))}
                ><Icon name="x" size={13} /></button>
              </div>
            </div>
          ))}
          <label className="grid h-24 w-32 cursor-pointer place-items-center rounded-lg border-2 border-dashed border-gray-300 text-sm text-gray-400 hover:border-brand-400 hover:text-brand-600">
            {uploading ? '…' : t('admin.editor.upload')}
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
            placeholder={t('admin.editor.imageUrlPlaceholder')}
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
            <h2 className="font-bold">{t('admin.editor.packagesTitle')}</h2>
            <p className="mt-0.5 text-xs text-gray-500">{t('admin.editor.packagesHelp')}</p>
          </div>
          <button
            className="btn-secondary px-3 py-1.5 text-xs"
            onClick={() => setPackages((p) => [...p, { name: t('admin.editor.packageN', { n: p.length + 1 }), description: '', price: '', comparePrice: '', autoDeliver: false, inStock: true, isActive: true, customFields: [] }])}
          >
            {t('admin.editor.addPackage')}
          </button>
        </div>
        <div className="mt-4 space-y-4">
          {packages.map((pkg, i) => (
            <div key={i} className="rounded-xl border border-gray-200 p-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <div>
                  <label className="label">{t('admin.editor.packageName')}</label>
                  <input className="input" value={pkg.name} onChange={(e) => updatePkg(i, { name: e.target.value })} />
                </div>
                <div>
                  <label className="label">{t('admin.editor.price')}</label>
                  <input className="input" type="number" min="0" step="0.01" value={pkg.price} onChange={(e) => updatePkg(i, { price: e.target.value })} />
                </div>
                <div>
                  <label className="label">{t('admin.editor.comparePrice')}</label>
                  <input className="input" type="number" min="0" step="0.01" placeholder={t('admin.editor.optional')} value={pkg.comparePrice} onChange={(e) => updatePkg(i, { comparePrice: e.target.value })} />
                </div>
                <div className="flex items-end gap-3 pb-1 text-sm">
                  <div className="flex-1">
                    <label className="label">{t('admin.editor.deliveryMethod')}</label>
                    <select
                      className="input"
                      value={pkg.autoDeliver ? 'auto' : 'manual'}
                      onChange={(e) => updatePkg(i, { autoDeliver: e.target.value === 'auto' })}
                    >
                      <option value="manual">{t('admin.editor.deliveryManual')}</option>
                      <option value="auto">{t('admin.editor.deliveryAuto')}</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-1.5 pb-2.5"><input type="checkbox" checked={pkg.isActive} onChange={(e) => updatePkg(i, { isActive: e.target.checked })} /> {t('admin.products.active')}</label>
                </div>
                {!pkg.autoDeliver && (
                  <div className="sm:col-span-4">
                    <label className="label">{t('admin.editor.availability')}</label>
                    <select
                      className={`input ${!pkg.inStock ? 'border-red-300 bg-red-50 text-red-700' : ''}`}
                      value={pkg.inStock ? 'in' : 'out'}
                      onChange={(e) => updatePkg(i, { inStock: e.target.value === 'in' })}
                    >
                      <option value="in">{t('admin.editor.inStockOpt')}</option>
                      <option value="out">{t('admin.editor.outStockOpt')}</option>
                    </select>
                    {!pkg.inStock && (
                      <p className="mt-1 text-xs text-gray-500">
                        {t('admin.editor.outStockHelp')}
                      </p>
                    )}
                  </div>
                )}
                <div className="sm:col-span-4">
                  <label className="label">{t('admin.editor.pkgShortDesc')}</label>
                  <input className="input" value={pkg.description} onChange={(e) => updatePkg(i, { description: e.target.value })} />
                </div>
              </div>

              {/* Custom fields builder */}
              <div className="mt-3 rounded-lg bg-gray-50 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {t('admin.editor.customFieldsTitle')}
                  </p>
                  <button
                    className="text-xs font-semibold text-brand-600 hover:underline"
                    onClick={() => updatePkg(i, { customFields: [...pkg.customFields, { key: `field_${pkg.customFields.length + 1}`, label: '', type: 'text', required: true }] })}
                  >
                    {t('admin.editor.addField')}
                  </button>
                </div>
                {pkg.customFields.map((f, fi) => (
                  <div key={fi} className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_110px_90px_auto]">
                    <input
                      className="input py-1.5 text-xs"
                      placeholder={t('admin.editor.fieldKeyPlaceholder')}
                      value={f.key}
                      onChange={(e) => {
                        const fields = [...pkg.customFields];
                        fields[fi] = { ...f, key: e.target.value.replace(/\s/g, '_').toLowerCase() };
                        updatePkg(i, { customFields: fields });
                      }}
                    />
                    <input
                      className="input py-1.5 text-xs"
                      placeholder={t('admin.editor.fieldLabelPlaceholder')}
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
                      <option value="text">{t('admin.editor.fieldText')}</option>
                      <option value="email">Email</option>
                      <option value="number">{t('admin.editor.fieldNumber')}</option>
                      <option value="textarea">{t('admin.editor.fieldMultiline')}</option>
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
                      /> {t('admin.editor.fieldRequired')}
                    </label>
                    <button
                      className="text-xs text-red-500 hover:underline"
                      onClick={() => updatePkg(i, { customFields: pkg.customFields.filter((_, x) => x !== fi) })}
                    >
                      {t('admin.editor.remove')}
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between">
                {pkg.id && pkg.autoDeliver ? (
                  <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setStockFor(pkg)}>
                    <Icon name="package" size={15} /> {t('admin.editor.manageStockCount', { count: pkg.stockCount ?? 0 })}
                  </button>
                ) : <span className="text-xs text-gray-400">{pkg.autoDeliver && !pkg.id ? t('admin.editor.saveFirst') : ''}</span>}
                {packages.length > 1 && (
                  <button className="text-xs text-red-500 hover:underline" onClick={() => setPackages((p) => p.filter((_, x) => x !== i))}>
                    {t('admin.editor.removePackage')}
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
  const t = useAdminT();
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
      toast(t('admin.editor.stockAdded', { added: d.added }));
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
        <h1 className="text-xl font-bold">{t('admin.editor.stockTitle', { name: pkg.name })}</h1>
        <button className="btn-secondary" onClick={onBack}>← {t('admin.editor.backToProduct')}</button>
      </div>
      <div className="card p-5">
        <p className="text-sm text-gray-500">{t('admin.inventory.poolSummary', { available: items.length, sold: soldCount })}</p>
        <label className="label mt-4">{t('admin.editor.addStockLabel')}</label>
        <textarea className="input font-mono text-xs" rows={5} value={lines} onChange={(e) => setLines(e.target.value)} placeholder={'KEY-AAAA-BBBB\nKEY-CCCC-DDDD'} />
        <button className="btn-primary mt-3" onClick={add} disabled={busy || !lines.trim()}>{t('admin.editor.addToStock')}</button>
      </div>
      <div className="card divide-y divide-gray-100">
        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-3 px-4 py-2.5">
            <code className="min-w-0 flex-1 truncate font-mono text-xs">{it.content}</code>
            <button className="text-xs text-red-500 hover:underline" onClick={() => removeItem(it.id)}>{t('admin.editor.remove')}</button>
          </div>
        ))}
        {items.length === 0 && <p className="px-4 py-8 text-center text-sm text-gray-400">{t('admin.editor.noStock')}</p>}
      </div>
    </div>
  );
}
