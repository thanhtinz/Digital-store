import { en } from './en';
import { vi } from './vi';

export const LOCALES = ['en', 'vi'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_NAMES: Record<Locale, string> = { en: 'English', vi: 'Tiếng Việt' };

export type Dictionary = Record<string, string>;

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function getDictionary(locale: Locale): Dictionary {
  return locale === 'vi' ? vi : en;
}

// Looks a key up, filling {placeholders}. An untranslated key falls back to
// English rather than showing a raw key to a customer.
export function translate(dict: Dictionary, key: string, vars?: Record<string, string | number>): string {
  const template = dict[key] ?? en[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match
  );
}

export type TFunction = (key: string, vars?: Record<string, string | number>) => string;

export function makeT(locale: Locale): TFunction {
  const dict = getDictionary(locale);
  return (key, vars) => translate(dict, key, vars);
}

// Intl locale tags for dates and numbers.
export const INTL_LOCALE: Record<Locale, string> = { en: 'en-US', vi: 'vi-VN' };
