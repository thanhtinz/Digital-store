'use client';

import { useRouter } from 'next/navigation';
import { useStore } from './Providers';
import { LOCALES, LOCALE_NAMES } from '@/i18n';
import Icon from './icons';

// The locale is a cookie read on the server, so switching means writing it and
// asking the server to re-render — that keeps one source of truth.
export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale } = useStore();
  const router = useRouter();

  const pick = (next: string) => {
    if (next === locale) return;
    document.cookie = `ds_lang=${next}; path=/; max-age=${365 * 86400}; samesite=lax`;
    router.refresh();
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-0.5">
        {LOCALES.map((l) => (
          <button
            key={l}
            onClick={() => pick(l)}
            className={`rounded px-2 py-1 text-xs font-bold uppercase transition ${
              locale === l ? 'bg-brand-600 text-white' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {l}
          </button>
        ))}
      </div>
    );
  }

  return (
    <label className="inline-flex items-center gap-1.5 text-sm text-gray-400">
      <Icon name="store" size={15} />
      <select
        aria-label="Language"
        value={locale}
        onChange={(e) => pick(e.target.value)}
        className="cursor-pointer bg-transparent font-medium outline-none hover:text-white"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l} className="text-gray-900">
            {LOCALE_NAMES[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
