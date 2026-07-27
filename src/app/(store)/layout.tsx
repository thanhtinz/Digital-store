import prisma from '@/lib/db';
import { getPublicSettings } from '@/lib/settings';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LiveChat from '@/components/LiveChat';

export const dynamic = 'force-dynamic';

// Storefront chrome: public header + footer around every shop page.
export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  let settings = { siteName: 'Digital Store', tagline: '', logo: '', footerText: '', footerAbout: '', supportEmail: '', socials: {}, features: {} } as any;
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
      <Header siteName={settings.siteName} logo={settings.logo} categories={categories} features={settings.features || {}} />
      <main className="flex-1">{children}</main>
      {settings.features?.livechat !== false && settings.features?.support !== false && <LiveChat />}
      <Footer
        siteName={settings.siteName}
        tagline={settings.tagline}
        logo={settings.logo}
        footerText={settings.footerText}
        footerAbout={settings.footerAbout}
        supportEmail={settings.supportEmail}
        socials={settings.socials || {}}
        categories={categories}
        features={settings.features || {}}
      />
    </>
  );
}
