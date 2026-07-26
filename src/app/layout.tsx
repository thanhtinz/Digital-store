import type { Metadata } from 'next';
import { getPublicSettings } from '@/lib/settings';
import Providers from '@/components/Providers';
import './globals.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const s = await getPublicSettings();
    return {
      title: { default: s.siteName, template: `%s — ${s.siteName}` },
      description: s.tagline,
    };
  } catch {
    return { title: 'Digital Store' };
  }
}

// Root layout is chrome-free: the storefront group and the admin section each
// bring their own header/menu/footer.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
