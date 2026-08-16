import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getPublicSettings } from '@/lib/settings';
import { DEFAULT_MONEY_FORMAT } from '@/lib/utils';
import { DEFAULT_THEME, fontUrl, parseThemeCookie, resolveTheme, themeCssVars } from '@/lib/theme';
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
// bring their own header/menu/footer. The money format and theme are resolved
// here and server-rendered into the first paint, so nothing flashes in the
// wrong currency or the wrong colour while a client fetch is in flight.
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let money = DEFAULT_MONEY_FORMAT;
  let storeTheme = DEFAULT_THEME;
  let allowOverride = true;
  try {
    const s = await getPublicSettings();
    money = s.money;
    storeTheme = s.theme;
    allowOverride = s.themeAllowOverride;
  } catch {
    // DB unreachable (e.g. first boot) — fall back to the defaults.
  }

  const override = allowOverride ? parseThemeCookie(cookies().get('ds_theme')?.value) : null;
  const theme = resolveTheme(storeTheme, override);
  const font = fontUrl(theme.font);

  return (
    <html lang="en">
      <head>
        {font && (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
            <link rel="stylesheet" href={font} />
          </>
        )}
        <style dangerouslySetInnerHTML={{ __html: themeCssVars(theme) }} />
      </head>
      <body className="flex min-h-screen flex-col">
        <Providers money={money} theme={theme} allowThemeOverride={allowOverride}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
