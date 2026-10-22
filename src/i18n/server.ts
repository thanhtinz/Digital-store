import { cookies, headers } from 'next/headers';
import { DEFAULT_LOCALE, isLocale, makeT, type Locale, type TFunction } from './index';

export const LOCALE_COOKIE = 'ds_lang';

// Parses an Accept-Language header into primary language tags ('vi', 'en', …)
// ordered by the browser's stated preference: q-value first, header order as
// the tiebreak. Ranges the browser explicitly refuses (q=0) are dropped.
function parseAcceptLanguage(header: string): string[] {
  return header
    .split(',')
    .map((part, index) => {
      const [rawTag, ...params] = part.split(';');
      const tag = rawTag.trim().toLowerCase().split('-')[0];
      let q = 1;
      for (const param of params) {
        const [name, value] = param.split('=').map((s) => s.trim());
        if (name === 'q') q = Number(value);
      }
      return { tag, q: Number.isFinite(q) ? q : 1, index };
    })
    .filter((r) => r.tag && r.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index)
    .map((r) => r.tag);
}

// Resolution order: the ds_lang cookie (an explicit pick in the switcher
// always wins), then the browser's Accept-Language, then Vietnamese. Within
// Accept-Language, an offered 'vi' wins even when English is listed first —
// browsers report every language the visitor reads, and this store is
// Vietnamese-first.
export function getLocale(): Locale {
  const cookie = cookies().get(LOCALE_COOKIE)?.value;
  if (isLocale(cookie)) return cookie;
  const offered = parseAcceptLanguage(headers().get('accept-language') || '');
  if (offered.includes('vi')) return 'vi';
  for (const tag of offered) {
    if (isLocale(tag)) return tag;
  }
  return configuredDefault ?? DEFAULT_LOCALE;
}

// The fallback of last resort above is configurable: it is the store's
// `default_locale` setting (chosen in the first-run setup / admin). That
// value lives in the database while getLocale() is synchronous, so the root
// layout primes this module-level cache on each request — the setting is a
// single global for the whole store, never per-visitor state.
let configuredDefault: Locale | null = null;
let configuredDefaultAt = 0;
const CONFIGURED_DEFAULT_TTL_MS = 60_000;

export async function primeDefaultLocale(): Promise<void> {
  if (Date.now() - configuredDefaultAt < CONFIGURED_DEFAULT_TTL_MS) return;
  configuredDefaultAt = Date.now();
  try {
    const { getSetting } = await import('@/lib/settings');
    const value = await getSetting('default_locale');
    configuredDefault = isLocale(value) ? value : null;
  } catch {
    configuredDefault = null;
  }
}

export function getT(): TFunction {
  return makeT(getLocale());
}
