'use client';

import { useCallback, useEffect, useState } from 'react';
import { ADMIN_INTL_LOCALE, useAdminT, useStore } from '@/components/Providers';
import { api } from '@/lib/client';
import { Stars } from '@/components/ProductCardView';

export default function AdminReviewsPage() {
  const { toast } = useStore();
  const t = useAdminT();
  const [reviews, setReviews] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [replyText, setReplyText] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    const d = await api<{ reviews: any[]; total: number }>(`/api/admin/reviews?page=${page}`);
    setReviews(d.reviews);
    setTotal(d.total);
  }, [page]);

  useEffect(() => { load().catch(() => {}); }, [load]);

  const update = async (id: number, body: any) => {
    try {
      await api(`/api/admin/reviews/${id}`, { method: 'PATCH', json: body });
      toast(t('admin.reviews.updatedToast'));
      await load();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  const remove = async (id: number) => {
    if (!confirm(t('admin.reviews.deleteConfirm'))) return;
    await api(`/api/admin/reviews/${id}`, { method: 'DELETE' });
    await load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">{t('admin.reviews.title')} <span className="text-sm font-normal text-gray-400">({total})</span></h1>
      <div className="mt-4 space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className="card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">
                  {r.user.name} <span className="font-normal text-gray-400">{t('admin.reviews.on')}</span>{' '}
                  <a href={`/product/${r.product.slug}`} className="text-brand-600 hover:underline" target="_blank">{r.product.name}</a>
                </p>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                  <Stars value={r.rating} size={12} />
                  {new Date(r.createdAt).toLocaleDateString(ADMIN_INTL_LOCALE)}
                  {!r.isApproved && <span className="badge bg-amber-100 text-amber-700">{t('admin.products.hidden')}</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => update(r.id, { isApproved: !r.isApproved })}>
                  {r.isApproved ? t('admin.reviews.hide') : t('admin.reviews.approve')}
                </button>
                <button className="text-xs text-red-500 hover:underline" onClick={() => remove(r.id)}>{t('admin.editor.delete')}</button>
              </div>
            </div>
            {r.content && <p className="mt-2 text-sm text-gray-700">{r.content}</p>}
            {r.adminReply ? (
              <div className="mt-2 rounded-lg bg-gray-50 p-3 text-sm">
                <p className="text-xs font-bold text-brand-700">{t('admin.reviews.storeResponse')}</p>
                <p className="mt-0.5 text-gray-600">{r.adminReply}</p>
                <button className="mt-1 text-xs text-gray-400 hover:underline" onClick={() => update(r.id, { adminReply: '' })}>{t('admin.reviews.removeReply')}</button>
              </div>
            ) : (
              <div className="mt-2 flex gap-2">
                <input
                  className="input flex-1 py-1.5 text-xs"
                  placeholder={t('admin.reviews.replyPlaceholder')}
                  value={replyText[r.id] || ''}
                  onChange={(e) => setReplyText((t) => ({ ...t, [r.id]: e.target.value }))}
                />
                <button
                  className="btn-primary px-3 py-1.5 text-xs"
                  disabled={!(replyText[r.id] || '').trim()}
                  onClick={() => update(r.id, { adminReply: replyText[r.id] })}
                >
                  {t('admin.reviews.reply')}
                </button>
              </div>
            )}
          </div>
        ))}
        {reviews.length === 0 && <div className="card p-12 text-center text-gray-400">{t('admin.reviews.empty')}</div>}
      </div>

      {total > 20 && (
        <div className="mt-4 flex justify-center gap-2">
          <button className="btn-secondary px-3 py-1.5" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><span>←</span> {t('admin.common.prev')}</button>
          <span className="px-3 py-1.5 text-sm text-gray-500">{t('admin.common.pageOf', { page, total: Math.ceil(total / 20) })}</span>
          <button className="btn-secondary px-3 py-1.5" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage((p) => p + 1)}>{t('admin.common.next')} <span>→</span></button>
        </div>
      )}
    </div>
  );
}
