import type { Metadata } from 'next';
import prisma from '@/lib/db';
import { getPublicSettings } from '@/lib/settings';
import Providers from '@/components/Providers';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let settings = { siteName: 'Digital Store', tagline: '', logo: '', footerText: '', supportEmail: '' } as any;
  let categories: Array<{ id: number; name: string; slug: string }> = [];
  try {
    [settings, categories] = await Promise.all([
      getPublicSettings(),
      prisma.category.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        select: { id: true, name: true, slug: true },
      }),
    ]);
  } catch {
    // DB not reachable (e.g. first boot) — render the shell anyway.
  }

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <Providers>
          <Header siteName={settings.siteName} logo={settings.logo} categories={categories} />
          <main className="flex-1">{children}</main>
          <Footer
            siteName={settings.siteName}
            tagline={settings.tagline}
            footerText={settings.footerText}
            supportEmail={settings.supportEmail}
            categories={categories}
          />
        </Providers>
      </body>
    </html>
  );
}
