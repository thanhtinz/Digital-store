import Link from 'next/link';
import prisma from '@/lib/db';
import { Stars } from '@/components/ProductCardView';
import Icon from '@/components/icons';
import { notFound } from 'next/navigation';
import { featureEnabled } from '@/lib/features';
import { formatDate } from '@/lib/utils';
import { INTL_LOCALE } from '@/i18n';
import { getLocale, getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  return { title: getT()('meta.reviews') };
}

// Public wall of recent verified reviews across every product.
export default async function ReviewsPage() {
  const intlLocale = INTL_LOCALE[getLocale()];
  const t = getT();
  if (!(await featureEnabled('reviews'))) notFound();

  const [reviews, agg, count5] = await Promise.all([
    prisma.review.findMany({
      where: { isApproved: true },
      orderBy: { createdAt: 'desc' },
      take: 60,
      include: {
        user: { select: { name: true, avatarUrl: true } },
        product: { select: { name: true, slug: true } },
      },
    }),
    prisma.review.aggregate({ where: { isApproved: true }, _avg: { rating: true }, _count: true }),
    prisma.review.count({ where: { isApproved: true, rating: 5 } }),
  ]);
  const avg = Math.round((agg._avg.rating || 0) * 10) / 10;

  return (
    <div className="container py-8">
      <p className="section-eyebrow">{t('reviews.eyebrow')}</p>
      <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{t('reviews.title')}</h1>
      <p className="mt-1 text-sm text-gray-500">{t('reviews.intro')}</p>

      {/* Summary strip */}
      <div className="card mt-5 flex flex-wrap items-center gap-6 p-5">
        <div>
          <p className="text-4xl font-extrabold">{avg || '—'}</p>
          <Stars value={avg} size={18} />
        </div>
        <div className="h-12 w-px bg-gray-100" />
        <div>
          <p className="text-2xl font-extrabold">{agg._count}</p>
          <p className="text-xs text-gray-500">{t('reviews.verified')}</p>
        </div>
        <div className="h-12 w-px bg-gray-100" />
        <div>
          <p className="text-2xl font-extrabold">{agg._count ? Math.round((count5 / agg._count) * 100) : 0}%</p>
          <p className="text-xs text-gray-500">{t('reviews.fiveStar')}</p>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="card mt-6 p-16 text-center text-gray-400">
          <Icon name="star" size={40} className="mx-auto text-gray-300" />
          <p className="mt-3 font-semibold text-gray-600">{t('reviews.empty')}</p>
        </div>
      ) : (
        <div className="mt-6 columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
          {reviews.map((r) => (
            <div key={r.id} className="card break-inside-avoid p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                  {r.user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.user.avatarUrl} alt={r.user.name} className="h-full w-full object-cover" />
                  ) : (
                    r.user.name.charAt(0).toUpperCase()
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{r.user.name}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Stars value={r.rating} size={12} />
                    {formatDate(r.createdAt, intlLocale, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>
              {r.content && <p className="mt-2.5 text-sm leading-relaxed text-gray-700">{r.content}</p>}
              {Array.isArray(r.images) && (r.images as string[]).length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {(r.images as string[]).map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-gray-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={t('catalog.reviewPhoto')} className="h-16 w-auto max-w-[120px] object-cover" />
                    </a>
                  ))}
                </div>
              )}
              <Link
                href={`/product/${r.product.slug}`}
                className="mt-3 flex items-center gap-1.5 border-t border-gray-100 pt-2.5 text-xs font-semibold text-brand-600 hover:underline"
              >
                <Icon name="bag" size={13} /> {r.product.name}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
