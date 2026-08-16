import { cookies, headers } from 'next/headers';
import { DEFAULT_LOCALE, isLocale, makeT, type Locale, type TFunction } from './index';

export const LOCALE_COOKIE = 'ds_lang';

// Cookie first, then the browser's Accept-Language, then English.
export function getLocale(): Locale {
  const cookie = cookies().get(LOCALE_COOKIE)?.value;
  if (isLocale(cookie)) return cookie;
  const accept = headers().get('accept-language') || '';
  for (const part of accept.split(',')) {
    const tag = part.split(';')[0].trim().slice(0, 2).toLowerCase();
    if (isLocale(tag)) return tag;
  }
  return DEFAULT_LOCALE;
}

export function getT(): TFunction {
  return makeT(getLocale());
}
