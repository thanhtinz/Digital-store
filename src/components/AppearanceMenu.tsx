'use client';

import { useEffect, useRef, useState } from 'react';
import { useStore, useT } from './Providers';
import { COLOR_PRESETS, FONT_PRESETS, TEXT_SIZES, serializeThemeCookie, type Theme } from '@/lib/theme';
import Icon from './icons';

// Lets a visitor override the store's appearance for themselves. The choice
// lives in their own cookie, so it never affects anyone else.
export default function AppearanceMenu() {
  const { theme, allowThemeOverride } = useStore();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Theme>(theme);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => setDraft(theme), [theme]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  if (!allowThemeOverride) return null;

  // A full reload is the honest way to apply this: the theme is server
  // rendered into <head>, and the font stylesheet has to be swapped too.
  const apply = (next: Theme) => {
    setDraft(next);
    document.cookie = `ds_theme=${serializeThemeCookie(next)}; path=/; max-age=${365 * 86400}; samesite=lax`;
    window.location.reload();
  };

  const reset = () => {
    document.cookie = 'ds_theme=; path=/; max-age=0; samesite=lax';
    window.location.reload();
  };

  return (
    <div className="relative" ref={box}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 transition hover:text-white"
      >
        <Icon name="spark" size={15} /> {t('footer.appearance')}
      </button>

      {/* Anchored right: the trigger sits at the footer's right edge, so a
          left-anchored panel would run off the viewport. */}
      {open && (
        <div className="absolute bottom-full right-0 z-50 mb-2 w-72 rounded-2xl border border-gray-200 bg-white p-4 text-gray-900 shadow-2xl">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{t('appearance.colour')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c.key}
                aria-label={t(`theme.color.${c.key}`)}
                title={t(`theme.color.${c.key}`)}
                onClick={() => apply({ ...draft, color: c.key })}
                className={`h-7 w-7 rounded-full ring-2 ring-offset-2 transition ${
                  draft.color === c.key ? 'ring-gray-900' : 'ring-transparent hover:ring-gray-300'
                }`}
                style={{ background: `rgb(${c.shades[6]})` }}
              />
            ))}
          </div>

          <p className="mt-4 text-xs font-bold uppercase tracking-wide text-gray-500">{t('appearance.typeface')}</p>
          <select
            className="input mt-2"
            value={draft.font}
            onChange={(e) => apply({ ...draft, font: e.target.value })}
          >
            {/* Typeface names are brand names; only the generic option is translated. */}
            {FONT_PRESETS.map((f) => (
              <option key={f.key} value={f.key}>{f.key === 'system' ? t('theme.font.system') : f.name}</option>
            ))}
          </select>

          <p className="mt-4 text-xs font-bold uppercase tracking-wide text-gray-500">{t('appearance.textSize')}</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {TEXT_SIZES.map((size) => (
              <button
                key={size.key}
                onClick={() => apply({ ...draft, textSize: size.key })}
                className={`rounded-lg border py-1.5 text-xs font-semibold transition ${
                  draft.textSize === size.key ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                {t(`theme.size.${size.key}`)}
              </button>
            ))}
          </div>

          <button onClick={reset} className="mt-4 text-xs font-semibold text-gray-500 hover:text-brand-600">
            {t('appearance.reset')}
          </button>
        </div>
      )}
    </div>
  );
}
