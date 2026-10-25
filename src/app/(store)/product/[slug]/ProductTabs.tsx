'use client';

import { useEffect, useRef, useState } from 'react';
import { useStore, useT } from '@/components/Providers';
import { api } from '@/lib/client';
import { Stars } from '@/components/ProductCardView';
import { AttachmentPicker, useAttachmentLabels } from '@/components/TicketParts';
import { formatDate } from '@/lib/utils';
import { INTL_LOCALE } from '@/i18n';

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
  reviewsEnabled?: boolean;
  productId: number;
  description: string | null;
  guide: string | null;
  ratingAvg: number;
  ratingCount: number;
  reviews: ReviewView[];
};

// Shopee-style section header: a light strip with an uppercase title, no tabs.
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="bg-gray-50/90 px-5 py-3.5 sm:px-6">
      <h2 className="text-[15px] font-semibold uppercase tracking-wide text-gray-800">{title}</h2>
    </div>
  );
}

// Long HTML content starts folded with a fade, like Shopee's description
// block, and expands in place with a See more / Show less button.
function ExpandableHtml({ html }: { html: string }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const [fullHeight, setFullHeight] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (ref.current) setFullHeight(ref.current.scrollHeight);
  }, [html]);

  const collapsible = fullHeight > 320;

  return (
    <div>
      <div className="relative">
        <div
          ref={ref}
          className="prose-content overflow-hidden transition-[max-height] duration-300"
          style={collapsible ? { maxHeight: expanded ? fullHeight : 300 } : undefined}
        >
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
        {collapsible && !expanded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white via-white/70 to-transparent" />
        )}
      </div>
      {collapsible && (
        <div className="mt-4 border-t border-gray-100 pt-3 text-center">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 px-5 py-1.5 text-sm font-medium text-brand-700 transition hover:bg-brand-50"
          >
            {expanded ? t('product.seeLess') : t('product.seeMore')}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

// The product page's lower half, Shopee layout: description, usage guide and
// reviews are stacked sections on one scrolling page instead of tabs.
export default function ProductTabs({ reviewsEnabled = true, productId, description, guide, ratingAvg, ratingCount, reviews }: Props) {
  const t = useT();

  if (!description && !guide && !reviewsEnabled) return null;

  return (
    <div className="space-y-6">
      {description && (
        <section className="card overflow-hidden">
          <SectionHeader title={t('product.descriptionFull')} />
          <div className="p-5 sm:p-6">
            <ExpandableHtml html={description} />
          </div>
        </section>
      )}
      {guide && (
        <section className="card overflow-hidden">
          <SectionHeader title={t('product.guide')} />
          <div className="p-5 sm:p-6">
            <ExpandableHtml html={guide} />
          </div>
        </section>
      )}
      {reviewsEnabled && (
        <section id="reviews" className="card scroll-mt-36 overflow-hidden">
          <SectionHeader title={t('product.reviewsFull')} />
          <ReviewsSection productId={productId} ratingAvg={ratingAvg} ratingCount={ratingCount} reviews={reviews} />
        </section>
      )}
    </div>
  );
}

type ReviewFilter = 'all' | 'images' | 'comments' | number;

function ReviewsSection({ productId, ratingAvg, ratingCount, reviews }: Omit<Props, 'description' | 'guide' | 'reviewsEnabled'>) {
  const { user, toast, locale } = useStore();
  const t = useT();
  const attachLabels = useAttachmentLabels();
  const intlLocale = INTL_LOCALE[locale];
  const [filter, setFilter] = useState<ReviewFilter>('all');
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const countFor = (star: number) => reviews.filter((r) => r.rating === star).length;
  const withImages = reviews.filter((r) => r.images.length > 0).length;
  const withComments = reviews.filter((r) => r.content && r.content.trim()).length;

  const chips: { key: ReviewFilter; label: string }[] = [
    { key: 'all', label: t('product.filterAll') },
    ...[5, 4, 3, 2, 1].map((star) => ({
      key: star as ReviewFilter,
      label: `${t('product.filterStars', { count: star })} (${countFor(star)})`,
    })),
    { key: 'images' as ReviewFilter, label: `${t('product.withPhotos')} (${withImages})` },
    { key: 'comments' as ReviewFilter, label: `${t('product.withComments')} (${withComments})` },
  ];

  const filtered = reviews.filter((r) => {
    if (filter === 'all') return true;
    if (filter === 'images') return r.images.length > 0;
    if (filter === 'comments') return !!(r.content && r.content.trim());
    return r.rating === filter;
  });

  const submit = async () => {
    setBusy(true);
    try {
      await api('/api/reviews', { method: 'POST', json: { productId, rating, content, images } });
      toast(t('catalog.reviewThanks'));
      setSubmitted(true);
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {/* Rating overview, Shopee-style: big score on the left, filter chips on the right */}
      <div className="flex flex-col gap-5 border-b border-gray-100 bg-orange-50/50 px-5 py-5 sm:px-6 lg:flex-row lg:items-center">
        <div className="shrink-0 text-center lg:w-52">
          <p className="text-brand-600">
            <span className="text-4xl font-bold">{ratingAvg || '—'}</span>
            <span className="ml-1.5 text-base font-medium">{t('product.outOfFive')}</span>
          </p>
          <div className="mt-1.5 flex justify-center">
            <Stars value={ratingAvg} size={20} />
          </div>
          <p className="mt-1.5 text-sm text-gray-500">
            {ratingCount === 1 ? t('catalog.reviewCountOne') : t('catalog.reviewCount', { count: ratingCount })}
          </p>
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button
              key={String(chip.key)}
              onClick={() => setFilter(chip.key)}
              className={`min-w-[5.5rem] rounded border px-3 py-1.5 text-[13px] transition ${
                filter === chip.key
                  ? 'border-brand-600 bg-brand-50 font-medium text-brand-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-brand-400 hover:text-brand-700'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-5 sm:px-6">
        {/* Write a review */}
        {user && !submitted && (
          <div className="mb-6 rounded-xl border border-gray-100 bg-gray-50/70 p-4">
            <p className="text-sm font-semibold">{t('catalog.writeReview')}</p>
            <p className="mt-0.5 text-xs text-gray-500">{t('catalog.reviewAfterPurchase')}</p>
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <button key={i} onClick={() => setRating(i)} aria-label={t('catalog.stars', { count: i })}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill={i <= rating ? '#f59e0b' : '#e5e7eb'}>
                    <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3l-6.1 3.3 1.4-6.8L2.2 9.1l6.9-.8L12 2z" />
                  </svg>
                </button>
              ))}
            </div>
            <textarea
              className="input mt-2"
              rows={3}
              placeholder={t('catalog.reviewPlaceholder')}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <div className="mt-2">
              <AttachmentPicker attachments={images} onChange={setImages} toast={toast} labels={attachLabels} />
            </div>
            <button className="btn-primary mt-2 w-full sm:w-auto sm:px-8" onClick={submit} disabled={busy}>
              {busy ? t('catalog.submitting') : t('catalog.submitReview')}
            </button>
          </div>
        )}

        {/* Review list */}
        <div className="divide-y divide-gray-100">
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-500">
              {filter === 'all' ? t('catalog.noReviews') : t('product.noReviewsFilter')}
            </p>
          )}
          {filtered.map((r) => (
            <div key={r.id} className="py-5 first:pt-0 last:pb-0">
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
                    <span className="badge ml-2 bg-green-100 text-green-700">{t('catalog.verifiedPurchase')}</span>
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Stars value={r.rating} size={12} />
                    {formatDate(r.createdAt, intlLocale, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>
              {r.content && <p className="mt-2.5 text-sm leading-relaxed text-gray-700">{r.content}</p>}
              {r.images.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {r.images.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-gray-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={t('catalog.reviewPhoto')} className="h-20 w-auto max-w-[160px] object-cover transition hover:scale-105" />
                    </a>
                  ))}
                </div>
              )}
              {r.adminReply && (
                <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm">
                  <p className="text-xs font-bold text-brand-700">{t('catalog.storeResponse')}</p>
                  <p className="mt-1 text-gray-600">{r.adminReply}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
