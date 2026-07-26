'use client';

import { useState } from 'react';
import { useStore } from '@/components/Providers';
import { api } from '@/lib/client';
import { Stars } from '@/components/ProductCardView';
import { AttachmentPicker } from '@/components/TicketParts';

type ReviewView = {
  id: number;
  rating: number;
  content: string | null;
  adminReply: string | null;
  images: string[];
  userName: string;
  avatarUrl: string | null;
  createdAt: string;
};

type Props = {
  productId: number;
  description: string | null;
  guide: string | null;
  ratingAvg: number;
  ratingCount: number;
  reviews: ReviewView[];
};

export default function ProductTabs({ productId, description, guide, ratingAvg, ratingCount, reviews }: Props) {
  const tabs = [
    { key: 'description', label: 'Description', show: !!description },
    { key: 'guide', label: 'How to use', show: !!guide },
    { key: 'reviews', label: `Reviews (${ratingCount})`, show: true },
  ].filter((t) => t.show);
  const [tab, setTab] = useState(tabs[0]?.key || 'reviews');

  return (
    <div className="card overflow-hidden">
      <div className="flex overflow-x-auto border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap px-5 py-3.5 text-sm font-semibold transition ${
              tab === t.key ? 'border-b-2 border-brand-600 text-brand-700' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="p-5 sm:p-6">
        {tab === 'description' && description && (
          <div className="prose-content" dangerouslySetInnerHTML={{ __html: description }} />
        )}
        {tab === 'guide' && guide && (
          <div className="prose-content" dangerouslySetInnerHTML={{ __html: guide }} />
        )}
        {tab === 'reviews' && (
          <ReviewsSection productId={productId} ratingAvg={ratingAvg} ratingCount={ratingCount} reviews={reviews} />
        )}
      </div>
    </div>
  );
}

function ReviewsSection({ productId, ratingAvg, ratingCount, reviews }: Omit<Props, 'description' | 'guide'>) {
  const { user, toast } = useStore();
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  const submit = async () => {
    setBusy(true);
    try {
      await api('/api/reviews', { method: 'POST', json: { productId, rating, content, images } });
      toast('Thank you for your review!');
      setSubmitted(true);
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
      {/* Summary + form */}
      <div>
        <div className="text-center lg:text-left">
          <p className="text-4xl font-extrabold">{ratingAvg || '—'}</p>
          <div className="mt-1"><Stars value={ratingAvg} size={18} /></div>
          <p className="mt-1 text-sm text-gray-500">{ratingCount} review{ratingCount === 1 ? '' : 's'}</p>
        </div>
        <div className="mt-4 space-y-1.5">
          {distribution.map(({ star, count }) => (
            <div key={star} className="flex items-center gap-2 text-xs">
              <span className="w-3 font-medium">{star}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3l-6.1 3.3 1.4-6.8L2.2 9.1l6.9-.8L12 2z" /></svg>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-amber-400"
                  style={{ width: reviews.length ? `${(count / reviews.length) * 100}%` : '0%' }}
                />
              </div>
              <span className="w-6 text-right text-gray-500">{count}</span>
            </div>
          ))}
        </div>

        {user && !submitted && (
          <div className="mt-6 rounded-xl bg-gray-50 p-4">
            <p className="text-sm font-semibold">Write a review</p>
            <p className="mt-0.5 text-xs text-gray-500">Available after you purchase this product.</p>
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <button key={i} onClick={() => setRating(i)} aria-label={`${i} stars`}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill={i <= rating ? '#f59e0b' : '#e5e7eb'}>
                    <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3l-6.1 3.3 1.4-6.8L2.2 9.1l6.9-.8L12 2z" />
                  </svg>
                </button>
              ))}
            </div>
            <textarea
              className="input mt-2"
              rows={3}
              placeholder="Share your experience…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <div className="mt-2">
              <AttachmentPicker attachments={images} onChange={setImages} toast={toast} />
            </div>
            <button className="btn-primary mt-2 w-full" onClick={submit} disabled={busy}>
              {busy ? 'Submitting…' : 'Submit review'}
            </button>
          </div>
        )}
      </div>

      {/* Review list */}
      <div className="space-y-5">
        {reviews.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-500">No reviews yet — be the first to review this product.</p>
        )}
        {reviews.map((r) => (
          <div key={r.id} className="border-b border-gray-100 pb-5 last:border-0">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                {r.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.avatarUrl} alt={r.userName} className="h-full w-full object-cover" />
                ) : (
                  r.userName.charAt(0).toUpperCase()
                )}
              </span>
              <div>
                <p className="text-sm font-semibold">
                  {r.userName}
                  <span className="badge ml-2 bg-green-100 text-green-700">Verified purchase</span>
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Stars value={r.rating} size={12} />
                  {new Date(r.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </div>
              </div>
            </div>
            {r.content && <p className="mt-2.5 text-sm leading-relaxed text-gray-700">{r.content}</p>}
            {r.images.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-2">
                {r.images.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-gray-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="review photo" className="h-20 w-auto max-w-[160px] object-cover transition hover:scale-105" />
                  </a>
                ))}
              </div>
            )}
            {r.adminReply && (
              <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm">
                <p className="text-xs font-bold text-brand-700">Store response</p>
                <p className="mt-1 text-gray-600">{r.adminReply}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
