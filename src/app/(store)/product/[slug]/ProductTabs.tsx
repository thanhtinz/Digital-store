'use client';

import { useEffect, useRef, useState } from 'react';
import { useStore, useT } from '@/components/Providers';
import { api } from '@/lib/client';
import { Stars } from '@/components/ProductCardView';
import { AttachmentPicker, useAttachmentLabels } from '@/components/TicketParts';
import { formatDate, formatNumber } from '@/lib/utils';
import { INTL_LOCALE } from '@/i18n';

// Shopee rates with orange-red stars; follow the store's brand colour, whose
// default is exactly Shopee's #ee4d2d.
const STAR_COLOR = 'rgb(var(--brand-600))';

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
  categoryName: string | null;
  categorySlug: string | null;
  soldCount: number;
  packagesCount: number;
};

// Shopee section block: flat solid white, 2px corners, hairline shadow —
// deliberately NOT the store's frosted-glass card.
const BLOCK = 'overflow-hidden rounded-[2px] bg-white shadow-[0_1px_1px_0_rgba(0,0,0,0.05)]';
const CONTENT = 'px-5 py-[25px] sm:px-[30px]';

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="bg-black/[0.02] px-5 py-3.5 sm:px-[30px]">
      <h2 className="text-lg font-normal uppercase leading-snug text-gray-900">{title}</h2>
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
        <div className="mt-4 text-center">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-[2px] border border-brand-600 bg-white px-10 py-2 text-sm text-brand-600 transition hover:bg-brand-50"
          >
            {expanded ? t('product.seeLess') : t('product.seeMore')}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
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

// Shopee's "CHI TIẾT SẢN PHẨM" spec table: grey label column, plain values.
function SpecsSection({ categoryName, categorySlug, soldCount, packagesCount, ratingAvg, ratingCount }: {
  categoryName: string | null;
  categorySlug: string | null;
  soldCount: number;
  packagesCount: number;
  ratingAvg: number;
  ratingCount: number;
}) {
  const t = useT();
  const { locale } = useStore();
  const intlLocale = INTL_LOCALE[locale];

  const rows: { label: string; value: React.ReactNode }[] = [];
  if (categoryName) {
    rows.push({
      label: t('product.specCategory'),
      value: categorySlug ? (
        <a href={`/category/${categorySlug}`} className="text-brand-600 hover:underline">{categoryName}</a>
      ) : (
        categoryName
      ),
    });
  }
  rows.push({ label: t('product.specDelivery'), value: t('product.specDeliveryAuto') });
  if (packagesCount > 0) rows.push({ label: t('product.specPackages'), value: packagesCount });
  rows.push({ label: t('product.specSold'), value: formatNumber(soldCount, intlLocale) });
  if (ratingCount > 0) {
    rows.push({
      label: t('product.reviews'),
      value: `${ratingAvg} (${ratingCount === 1 ? t('catalog.reviewCountOne') : t('catalog.reviewCount', { count: ratingCount })})`,
    });
  }

  return (
    <section className={BLOCK}>
      <SectionHeader title={t('product.detailsTitle')} />
      <div className={`${CONTENT} py-[15px] sm:py-[15px]`}>
        {rows.map((row) => (
          <div key={row.label} className="flex py-2.5 text-sm">
            <span className="w-[160px] shrink-0 pr-3 text-black/40">{row.label}</span>
            <span className="min-w-0 text-black/80">{row.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// The product page's lower half in Shopee's layout: flat white blocks stacked
// on one scrolling page — details table, description, usage guide, reviews.
export default function ProductTabs(props: Props) {
  const { reviewsEnabled = true, description, guide } = props;
  const t = useT();

  return (
    <div className="space-y-5">
      <SpecsSection
        categoryName={props.categoryName}
        categorySlug={props.categorySlug}
        soldCount={props.soldCount}
        packagesCount={props.packagesCount}
        ratingAvg={props.ratingAvg}
        ratingCount={props.ratingCount}
      />
      {description && (
        <section className={BLOCK}>
          <SectionHeader title={t('product.descriptionFull')} />
          <div className={CONTENT}>
            <ExpandableHtml html={description} />
          </div>
        </section>
      )}
      {guide && (
        <section className={BLOCK}>
          <SectionHeader title={t('product.guide')} />
          <div className={CONTENT}>
            <ExpandableHtml html={guide} />
          </div>
        </section>
      )}
      {reviewsEnabled && (
        <section id="reviews" className={`${BLOCK} scroll-mt-36`}>
          <SectionHeader title={t('product.reviewsFull')} />
          <ReviewsSection
            productId={props.productId}
            ratingAvg={props.ratingAvg}
            ratingCount={props.ratingCount}
            reviews={props.reviews}
          />
        </section>
      )}
    </div>
  );
}

type ReviewFilter = 'all' | 'images' | 'comments' | number;

function ReviewsSection({ productId, ratingAvg, ratingCount, reviews }: {
  productId: number;
  ratingAvg: number;
  ratingCount: number;
  reviews: ReviewView[];
}) {
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
    <div className={CONTENT}>
      {/* Rating overview, Shopee-style: pale peach panel with a thin border,
          big brand-colour score on the left, square filter chips on the right */}
      <div className="flex flex-col gap-5 border border-[#f9ede5] bg-[#fffbf8] px-5 py-[25px] sm:px-[30px] lg:flex-row lg:items-center">
        <div className="shrink-0 text-center lg:w-44">
          <p className="text-brand-600">
            <span className="text-[30px] font-medium leading-none">{ratingAvg || '—'}</span>
            <span className="ml-1 text-lg leading-none">/5</span>
          </p>
          <div className="mt-2 flex justify-center">
            <Stars value={ratingAvg} size={20} color={STAR_COLOR} />
          </div>
          <p className="mt-2 text-sm text-black/60">
            {ratingCount === 1 ? t('catalog.reviewCountOne') : t('catalog.reviewCount', { count: ratingCount })}
          </p>
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button
              key={String(chip.key)}
              onClick={() => setFilter(chip.key)}
              className={`h-8 min-w-[100px] rounded-[2px] border px-2.5 text-sm transition ${
                filter === chip.key
                  ? 'border-brand-600 bg-brand-50 text-brand-600'
                  : 'border-black/10 bg-white text-gray-700 hover:border-brand-600 hover:text-brand-600'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Write a review */}
      {user && !submitted && (
        <div className="mt-6 rounded-[2px] border border-black/10 p-4">
          <p className="text-sm font-semibold">{t('catalog.writeReview')}</p>
          <p className="mt-0.5 text-xs text-gray-500">{t('catalog.reviewAfterPurchase')}</p>
          <div className="mt-2 flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <button key={i} onClick={() => setRating(i)} aria-label={t('catalog.stars', { count: i })}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill={i <= rating ? STAR_COLOR : '#e5e7eb'}>
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
          <button
            className="mt-3 rounded-[2px] bg-brand-600 px-8 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
            onClick={submit}
            disabled={busy}
          >
            {busy ? t('catalog.submitting') : t('catalog.submitReview')}
          </button>
        </div>
      )}

      {/* Review list */}
      <div>
        {filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-black/50">
            {filter === 'all' ? t('catalog.noReviews') : t('product.noReviewsFilter')}
          </p>
        )}
        {filtered.map((r) => (
          <div key={r.id} className="border-b border-black/5 py-5 last:border-0">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                {r.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.avatarUrl} alt={r.userName} className="h-full w-full object-cover" />
                ) : (
                  r.userName.charAt(0).toUpperCase()
                )}
              </span>
              <div className="min-w-0">
                <p className="text-xs text-black/80">
                  {r.userName}
                  <span className="badge ml-2 bg-green-100 text-green-700">{t('catalog.verifiedPurchase')}</span>
                </p>
                <div className="mt-1">
                  <Stars value={r.rating} size={12} color={STAR_COLOR} />
                </div>
                <p className="mt-1 text-xs text-black/40">
                  {formatDate(r.createdAt, intlLocale, { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
                {r.content && <p className="mt-2 text-sm leading-relaxed text-black/80">{r.content}</p>}
                {r.images.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {r.images.map((url) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden border border-black/5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={t('catalog.reviewPhoto')} className="h-[72px] w-[72px] object-cover transition hover:scale-105" />
                      </a>
                    ))}
                  </div>
                )}
                {r.adminReply && (
                  <div className="mt-3 bg-[#f5f5f5] p-3 text-sm">
                    <p className="text-xs font-medium text-black/80">{t('catalog.storeResponse')}</p>
                    <p className="mt-1 text-black/70">{r.adminReply}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
