import Link from 'next/link';
import { notFound } from 'next/navigation';
import prisma from '@/lib/db';
import Icon from '@/components/icons';
import { featureEnabled } from '@/lib/features';
import { formatDate } from '@/lib/utils';
import { INTL_LOCALE } from '@/i18n';
import { getLocale, getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = await prisma.post.findUnique({ where: { slug: params.slug } });
  if (!post || !post.isPublished) return { title: 'News' };
  return {
    title: post.title,
    description: post.excerpt || undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt || undefined,
      type: 'article',
      ...(post.coverImage ? { images: [post.coverImage] } : {}),
    },
  };
}

export default async function NewsPostPage({ params }: { params: { slug: string } }) {
  const intlLocale = INTL_LOCALE[getLocale()];
  const t = getT();
  if (!(await featureEnabled('news'))) notFound();

  const post = await prisma.post.findUnique({ where: { slug: params.slug } });
  if (!post || !post.isPublished) notFound();

  const more = await prisma.post.findMany({
    where: { isPublished: true, id: { not: post.id } },
    orderBy: { publishedAt: 'desc' },
    take: 3,
    select: { title: true, slug: true, coverImage: true, publishedAt: true },
  });

  return (
    <div className="container max-w-3xl py-8">
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-gray-500">
        <Link href="/" className="hover:text-brand-600">{t('catalog.home')}</Link>
        <span>/</span>
        <Link href="/news" className="hover:text-brand-600">{t('nav.news')}</Link>
        <span>/</span>
        <span className="truncate font-medium text-gray-900">{post.title}</span>
      </nav>

      <article className="card overflow-hidden">
        {post.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.coverImage} alt={post.title} className="max-h-[380px] w-full object-cover" />
        )}
        <div className="p-6 sm:p-8">
          {post.publishedAt && (
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              {formatDate(post.publishedAt, intlLocale, { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          )}
          <h1 className="mt-1 text-2xl font-bold leading-tight sm:text-3xl">{post.title}</h1>
          {post.excerpt && <p className="mt-3 text-base text-gray-600">{post.excerpt}</p>}
          <div className="prose-content mt-6" dangerouslySetInnerHTML={{ __html: post.content }} />
        </div>
      </article>

      {more.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-bold">{t('news.more')}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {more.map((p) => (
              <Link key={p.slug} href={`/news/${p.slug}`} className="card group overflow-hidden transition hover:shadow-md">
                {p.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.coverImage} alt={p.title} className="h-28 w-full object-cover" />
                ) : (
                  <div className="grid h-28 w-full place-items-center bg-gradient-to-br from-brand-50 to-brand-100 text-brand-300">
                    <Icon name="news" size={28} />
                  </div>
                )}
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-brand-700">{p.title}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
