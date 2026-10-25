'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useStore, useT } from './Providers';
import {
  COLOR_PRESETS, FONT_PRESETS, TEXT_SIZES, UI_STYLES, fontUrl, isValidHex, serializeThemeCookie, themeCssVars,
  type Theme,
} from '@/lib/theme';
import { api } from '@/lib/client';
import Icon from './icons';

const LIVE_STYLE_ID = 'ds-theme-live';
const LS_KEY = 'ds_theme';

// Applies a theme to the live document without a reload: the server-rendered
// <style> in <head> is overridden by an identical-specificity block appended
// after it, the root font-size/dir attributes are patched in place, and the
// Google Fonts stylesheet is swapped when the typeface changes.
function applyLive(next: Theme) {
  let style = document.getElementById(LIVE_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = LIVE_STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = themeCssVars(next);
  document.documentElement.dir = next.dir;
  document.documentElement.dataset.uiStyle = next.style;

  const url = fontUrl(next.font);
  let link = document.querySelector<HTMLLinkElement>('link[href*="fonts.googleapis.com/css2"]');
  if (!url) {
    link?.remove();
  } else if (link) {
    link.href = url;
  } else {
    link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);
  }
}

function persist(next: Theme) {
  const raw = serializeThemeCookie(next);
  document.cookie = `ds_theme=${raw}; path=/; max-age=${365 * 86400}; samesite=lax`;
  try { localStorage.setItem(LS_KEY, raw); } catch { /* private mode */ }
}

// Appearance customizer: a gear button on the storefront chrome (and a text
// link in the footer) opening one shared panel. Every change previews
// instantly, persists on the visitor's own device (cookie + localStorage),
// and never affects anyone else — unless an admin explicitly saves it as
// the site-wide default through the normal settings API.
export default function AppearanceMenu({
  variant = 'link',
  placement = 'up',
}: {
  variant?: 'gear' | 'link';
  placement?: 'up' | 'down';
}) {
  const { theme, allowThemeOverride, user, toast } = useStore();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Theme>(theme);
  const [saving, setSaving] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  // Dropdown placement resolved on open from the trigger's viewport rect:
  // the panel hangs directly below the trigger (flipping above it only when
  // the viewport's bottom edge leaves no room) and shifts sideways just
  // enough to stay inside the viewport — always anchored to the trigger.
  const [pos, setPos] = useState<{ above: boolean; shiftX: number } | null>(null);

  useEffect(() => setDraft(theme), [theme]);

  // If a previous visit stored a choice in localStorage but the cookie is
  // gone (cleared cookies, new browser profile), restore the cookie and
  // reload once so the server render matches the visitor's device again.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored && !document.cookie.includes('ds_theme=')) {
        document.cookie = `ds_theme=${stored}; path=/; max-age=${365 * 86400}; samesite=lax`;
        window.location.reload();
      }
    } catch { /* storage unavailable */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (box.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    // The panel is anchored to the trigger; if the page moves under it,
    // close rather than leave it floating in the wrong spot.
    const dismiss = () => setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', dismiss, true);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('scroll', dismiss, true);
    };
  }, [open ]);

  const PANEL_W = 340;
  const PANEL_H_EST = 540;

  const toggle = () => {
    if (!open && box.current) {
      const rect = box.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = Math.min(PANEL_W, vw - 24);
      // Horizontal: gear triggers hug the right edge (align the panel's
      // right edge with the trigger's), link triggers align left edges —
      // then clamp the result inside the viewport with a 12px margin.
      let shiftX = variant === 'gear' ? rect.width - w : 0;
      const absLeft = rect.left + shiftX;
      if (absLeft < 12) shiftX += 12 - absLeft;
      if (rect.left + shiftX + w > vw - 12) shiftX -= rect.left + shiftX + w - (vw - 12);
      // Vertical: below the trigger unless the bottom edge is too close
      // and there is clearly more room above (footer trigger at page end).
      // A caller asking for 'up' gets above whenever it fits there.
      const fitsAbove = rect.top > PANEL_H_EST + 16;
      const above = placement === 'up' ? fitsAbove : vh - rect.bottom < PANEL_H_EST + 16 && fitsAbove;
      setPos({ above, shiftX });
    }
    setOpen((v) => !v);
  };

  if (!allowThemeOverride) return null;

  const apply = (next: Theme) => {
    setDraft(next);
    applyLive(next);
    persist(next);
  };

  const reset = () => {
    document.cookie = 'ds_theme=; path=/; max-age=0; samesite=lax';
    try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
    window.location.reload();
  };

  const saveAsDefault = async () => {
    setSaving(true);
    try {
      await api('/api/admin/settings', {
        method: 'POST',
        json: {
          theme_color: draft.color,
          theme_custom_color: draft.color === 'custom' ? draft.custom : '',
          theme_dir: draft.dir,
          theme_font: draft.font,
          theme_text_size: draft.textSize,
          theme_style: draft.style,
        },
      });
      toast(t('appearance.saved'));
    } catch (e) {
      toast((e as Error).message || 'Error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const sectionLabel = 'text-[11px] font-bold uppercase tracking-[.12em] text-gray-500';
  const segBtn = (active: boolean) =>
    `rounded-full px-2 py-1.5 text-xs font-semibold transition ${
      active ? 'bg-brand-600 text-white shadow-btn-primary' : 'bg-white/70 text-gray-600 ring-1 ring-gray-200 hover:bg-brand-50 hover:text-brand-700'
    }`;

  // The panel is an in-flow dropdown hanging off the trigger's relative
  // wrapper — opening directly under the button that was clicked, like a
  // menu. Its horizontal shift and above/below flip were resolved in
  // toggle() from the trigger's rect so it stays inside the viewport
  // without detaching into a fixed sheet. Width is a fixed 340px (never
  // squeezed by the trigger's own column), the background is near-opaque,
  // and z-index keeps it above page content.
  const panelStyle: CSSProperties = pos
    ? {
        left: pos.shiftX,
        ...(pos.above ? { bottom: 'calc(100% + 8px)' } : { top: 'calc(100% + 8px)' }),
        transformOrigin: pos.above ? 'bottom right' : 'top right',
      }
    : { top: 'calc(100% + 8px)', right: 0 };

  return (
    <div className="relative" ref={box}>
      {variant === 'gear' ? (
        <button
          onClick={toggle}
          aria-label={t('footer.appearance')}
          title={t('footer.appearance')}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/40 backdrop-blur transition hover:bg-white/30 active:scale-95"
        >
          <Icon name="settings" size={19} />
        </button>
      ) : (
        <button
          onClick={toggle}
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 transition hover:text-brand-600"
        >
          <Icon name="spark" size={14} /> {t('footer.appearance')}
        </button>
      )}

      {open && (
        <div
          style={panelStyle}
          className="absolute z-[120] w-[340px] max-w-[calc(100vw-1.5rem)] animate-scale-in rounded-3xl border border-white/60 bg-white/95 p-4 text-gray-900 shadow-pop backdrop-blur-2xl backdrop-saturate-150"
        >
          <p className={sectionLabel}>{t('appearance.style')}</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5 rounded-full bg-gray-100/80 p-1">
            {UI_STYLES.map((s) => (
              <button key={s.key} onClick={() => apply({ ...draft, style: s.key })} className={segBtn(draft.style === s.key)}>
                {t(`theme.style.${s.key}`)}
              </button>
            ))}
          </div>

          <p className={`mt-4 ${sectionLabel}`}>{t('appearance.colour')}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c.key}
                aria-label={t(`theme.color.${c.key}`)}
                title={t(`theme.color.${c.key}`)}
                onClick={() => apply({ ...draft, color: c.key })}
                className={`h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-white transition ${
                  draft.color === c.key ? 'ring-gray-900' : 'ring-transparent hover:ring-gray-300'
                }`}
                style={{ background: `rgb(${c.shades[6]})` }}
              />
            ))}
            {/* Custom colour: the native picker supplies any hex; the theme
                engine derives the full shade scale from it. */}
            <label
              title={t('appearance.custom')}
              className={`relative h-7 w-7 cursor-pointer overflow-hidden rounded-full ring-2 ring-offset-2 ring-offset-white transition ${
                draft.color === 'custom' ? 'ring-gray-900' : 'ring-transparent hover:ring-gray-300'
              }`}
              style={{
                background: draft.color === 'custom' && isValidHex(draft.custom)
                  ? draft.custom
                  : 'conic-gradient(#f43f5e,#f59e0b,#84cc16,#06b6d4,#8b5cf6,#f43f5e)',
              }}
            >
              <input
                type="color"
                value={isValidHex(draft.custom) ? draft.custom : '#ee4d2d'}
                onChange={(e) => apply({ ...draft, color: 'custom', custom: e.target.value })}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label={t('appearance.custom')}
              />
            </label>
          </div>

          <p className={`mt-4 ${sectionLabel}`}>{t('appearance.typeface')}</p>
          <select
            className="input mt-2 rounded-full py-2"
            value={draft.font}
            onChange={(e) => apply({ ...draft, font: e.target.value })}
          >
            {FONT_PRESETS.map((f) => (
              <option key={f.key} value={f.key}>{f.key === 'system' ? t('theme.font.system') : f.name}</option>
            ))}
          </select>

          <p className={`mt-4 ${sectionLabel}`}>{t('appearance.textSize')}</p>
          <div className="mt-2 grid grid-cols-3 gap-1.5 rounded-full bg-gray-100/80 p-1">
            {TEXT_SIZES.map((size) => (
              <button key={size.key} onClick={() => apply({ ...draft, textSize: size.key })} className={segBtn(draft.textSize === size.key)}>
                {t(`theme.size.${size.key}`)}
              </button>
            ))}
          </div>

          <p className={`mt-4 ${sectionLabel}`}>{t('appearance.direction')}</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5 rounded-full bg-gray-100/80 p-1">
            {(['ltr', 'rtl'] as const).map((d) => (
              <button key={d} onClick={() => apply({ ...draft, dir: d })} className={segBtn(draft.dir === d)}>
                {t(`appearance.${d}`)}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-2 border-t border-gray-200/70 pt-3">
            <button onClick={reset} className="shrink-0 whitespace-nowrap px-1 py-1.5 text-xs font-semibold text-gray-500 transition hover:text-brand-600">
              {t('appearance.reset')}
            </button>
            {user?.role === 'ADMIN' && (
              <button
                onClick={saveAsDefault}
                disabled={saving}
                className="btn-primary shrink-0 whitespace-nowrap px-2.5 py-1.5 text-xs"
              >
                {saving ? '…' : t('appearance.saveDefault')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
