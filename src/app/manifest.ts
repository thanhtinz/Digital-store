import type { MetadataRoute } from 'next';
import { getPublicSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

// PWA manifest so the store can be installed to the home screen.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let name = 'Digital Store';
  let logo = '';
  try {
    const s = await getPublicSettings();
    name = s.siteName || name;
    logo = s.logo || '';
  } catch {
    // DB unreachable — serve a sensible default manifest.
  }
  return {
    name,
    short_name: name.length > 12 ? name.slice(0, 12) : name,
    description: 'Instant delivery of premium digital goods',
    start_url: '/',
    display: 'standalone',
    background_color: '#f9fafb',
    theme_color: '#4f46e5',
    ...(logo
      ? { icons: [{ src: logo, sizes: 'any', type: 'image/png', purpose: 'any' }] }
      : {}),
  };
}
