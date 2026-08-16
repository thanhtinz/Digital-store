import type { Metadata } from 'next';
import { getPublicSettings } from '@/lib/settings';
import { DEFAULT_MONEY_FORMAT } from '@/lib/utils';
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
// bring their own header/menu/footer. The money format is resolved here and
// server-rendered into the first paint, so prices never flash in the wrong
// currency while a client fetch is in flight.
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let money = DEFAULT_MONEY_FORMAT;
  try {
    money = (await getPublicSettings()).money;
  } catch {
    // DB unreachable (e.g. first boot) — fall back to the default format.
  }
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <Providers money={money}>{children}</Providers>
      </body>
    </html>
  );
}
