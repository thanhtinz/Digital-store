import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { getPublicSettings } from '@/lib/settings';
import { isSetupComplete } from '@/lib/setup';
import { getT } from '@/i18n/server';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const dynamic = 'force-dynamic';

// Storefront chrome: public header + footer around every shop page.
export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  // First-run gate: until an admin account exists, every storefront page
  // goes to the installer. (/setup itself lives outside this group.)
  if (!(await isSetupComplete())) redirect('/setup');
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

  const t = getT();
  return (
    <>
      <Header siteName={settings.siteName} logo={settings.logo} categories={categories} features={settings.features || {}} />
      <main className="flex-1">{children}</main>
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
        t={t}
      />
    </>
  );
}
