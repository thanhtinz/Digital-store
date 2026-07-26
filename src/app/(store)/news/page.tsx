import Link from 'next/link';
import prisma from '@/lib/db';
import Icon from '@/components/icons';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'News' };

const PAGE_SIZE = 9;

export default async function NewsPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const where = { isPublished: true };
  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { title: true, slug: true, excerpt: true, coverImage: true, publishedAt: true },
    }),
    prisma.post.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="container py-8">
      <p className="section-eyebrow">Blog</p>
      <h1 className="mt-1 text-2xl font-bold sm:text-3xl">News & updates</h1>
      <p className="mt-1 text-sm text-gray-500">Product launches, promotions and announcements from the store.</p>

      {posts.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-gray-200 py-20 text-center text-gray-400">
          <Icon name="news" size={40} className="mx-auto text-gray-300" />
          <p className="mt-3 font-semibold text-gray-600">Nothing here yet</p>
          <p className="mt-1 text-sm">Check back soon for announcements.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:[grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]">
          {posts.map((p) => (
            <Link key={p.slug} href={`/news/${p.slug}`} className="card group overflow-hidden transition hover:shadow-md">
              {p.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.coverImage} alt={p.title} className="h-44 w-full object-cover transition group-hover:scale-[1.02]" />
              ) : (
                <div className="grid h-44 w-full place-items-center bg-gradient-to-br from-brand-50 to-brand-100 text-brand-300">
                  <Icon name="news" size={40} />
                </div>
              )}
              <div className="p-4">
                {p.publishedAt && (
                  <p className="text-xs text-gray-400">
                    {p.publishedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                )}
                <h2 className="mt-1 line-clamp-2 font-bold leading-snug group-hover:text-brand-700">{p.title}</h2>
                {p.excerpt && <p className="mt-1.5 line-clamp-3 text-sm text-gray-500">{p.excerpt}</p>}
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">
                  Read more <Icon name="arrow-right" size={14} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={`/news?page=${n}`}
              className={`grid h-9 w-9 place-items-center rounded-lg text-sm font-semibold ${
                n === page ? 'bg-brand-600 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:border-brand-300'
              }`}
            >
              {n}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
