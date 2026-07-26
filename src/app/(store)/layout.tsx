import prisma from '@/lib/db';
import { getPublicSettings } from '@/lib/settings';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const dynamic = 'force-dynamic';

// Storefront chrome: public header + footer around every shop page.
export default async function StoreLayout({ children }: { children: React.ReactNode }) {
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
    <>
      <Header siteName={settings.siteName} logo={settings.logo} categories={categories} />
      <main className="flex-1">{children}</main>
      <Footer
        siteName={settings.siteName}
        tagline={settings.tagline}
        footerText={settings.footerText}
        supportEmail={settings.supportEmail}
        categories={categories}
      />
    </>
  );
}
