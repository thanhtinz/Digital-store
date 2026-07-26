import type { MetadataRoute } from 'next';
import prisma from '@/lib/db';
import { getAppUrl } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (await getAppUrl()).replace(/\/$/, '');
  try {
    const [products, categories, posts] = await Promise.all([
      prisma.product.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
      prisma.category.findMany({ where: { isActive: true }, select: { slug: true } }),
      prisma.post.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
    ]);
    return [
      { url: base, changeFrequency: 'daily', priority: 1 },
      { url: `${base}/products`, changeFrequency: 'daily', priority: 0.9 },
      { url: `${base}/flash-sale`, changeFrequency: 'daily', priority: 0.8 },
      ...categories.map((c) => ({
        url: `${base}/category/${c.slug}`,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })),
      ...products.map((p) => ({
        url: `${base}/product/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })),
      { url: `${base}/news`, changeFrequency: 'weekly', priority: 0.6 },
      ...posts.map((p) => ({
        url: `${base}/news/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: 'monthly' as const,
        priority: 0.5,
      })),
      { url: `${base}/faq`, changeFrequency: 'monthly', priority: 0.3 },
      { url: `${base}/terms`, changeFrequency: 'yearly', priority: 0.2 },
      { url: `${base}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
      { url: `${base}/refund-policy`, changeFrequency: 'yearly', priority: 0.2 },
    ];
  } catch {
    return [{ url: base, priority: 1 }];
  }
}
