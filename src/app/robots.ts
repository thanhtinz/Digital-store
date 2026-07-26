import type { MetadataRoute } from 'next';
import { getAppUrl } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = (await getAppUrl()).replace(/\/$/, '');
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/', '/account', '/orders', '/wallet', '/cart', '/checkout', '/support'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
