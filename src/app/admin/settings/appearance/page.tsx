'use client';

import { useSettings, toggle, SettingsHeader } from '../shared';
import { useAdminT } from '@/components/Providers';
import { COLOR_PRESETS, FONT_PRESETS, TEXT_SIZES } from '@/lib/theme';
import Icon from '@/components/icons';

export default function AppearanceSettingsPage() {
  const { s, set, save, busy } = useSettings();
  const t = useAdminT();
  if (!s) return <div className="py-16 text-center text-gray-400">{t('admin.common.loading')}</div>;

  const color = s.theme_color || 'indigo';
  const font = s.theme_font || 'inter';
  const size = s.theme_text_size || 'normal';
  const preset = COLOR_PRESETS.find((c) => c.key === color) || COLOR_PRESETS[0];

  return (
    <div className="space-y-6">
      <SettingsHeader
        title={t('admin.appearance.title')}
        subtitle={t('admin.appearance.subtitle')}
        onSave={save}
        busy={busy}
      />

      <div className="card p-5">
        <h2 className="font-bold">{t('admin.appearance.colourTitle')}</h2>
        <p className="mt-0.5 text-sm text-gray-500">{t('admin.appearance.colourText')}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c.key}
              onClick={() => set('theme_color', c.key)}
              className={`rounded-xl border-2 p-3 text-left transition ${
                color === c.key ? 'border-gray-900' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="flex gap-1">
                {[5, 6, 7].map((i) => (
                  <span key={i} className="h-6 flex-1 rounded" style={{ background: `rgb(${c.shades[i]})` }} />
                ))}
              </span>
              <span className="mt-2 flex items-center gap-1 text-xs font-semibold">
                {color === c.key && <Icon name="check" size={13} />} {t(`theme.color.${c.key}`)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-bold">{t('admin.appearance.fontTitle')}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FONT_PRESETS.map((f) => (
            <button
              key={f.key}
              onClick={() => set('theme_font', f.key)}
              className={`rounded-xl border-2 p-4 text-left transition ${
                font === f.key ? 'border-gray-900' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="block text-lg font-bold" style={{ fontFamily: `${f.stack}, system-ui` }}>
                {f.name}
              </span>
              <span className="mt-0.5 block text-xs text-gray-500">{f.key === 'be-vietnam' ? t('admin.appearance.fontNoteBeVietnam') : f.key === 'system' ? t('admin.appearance.fontNoteSystem') : t('admin.appearance.fontNoteGoogle')}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-bold">{t('admin.appearance.sizeTitle')}</h2>
        <p className="mt-0.5 text-sm text-gray-500">{t('admin.appearance.sizeText')}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {TEXT_SIZES.map((sz) => (
            <button
              key={sz.key}
              onClick={() => set('theme_text_size', sz.key)}
              className={`rounded-xl border-2 p-4 text-left transition ${
                size === sz.key ? 'border-gray-900' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="block font-bold" style={{ fontSize: sz.rootPx }}>{t(`theme.size.${sz.key}`)}</span>
              <span className="mt-0.5 block text-xs text-gray-500">{t('admin.appearance.rootSize', { px: sz.rootPx })}</span>
            </button>
          ))}
        </div>
        <div className="mt-4">{toggle(s, set, 'theme_allow_override', t('admin.appearance.allowOverride'))}</div>
        <p className="mt-1 text-xs text-gray-400">
          {t('admin.appearance.overrideNote')}
        </p>
      </div>

      {/* Live preview using the selected values directly, not the saved ones */}
      <div className="card p-5">
        <h2 className="font-bold">{t('admin.appearance.previewTitle')}</h2>
        <div
          className="mt-4 rounded-2xl border border-gray-200 p-6"
          style={{ fontFamily: `${FONT_PRESETS.find((f) => f.key === font)?.stack || 'Inter'}, system-ui` }}
        >
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: `rgb(${preset.shades[6]})` }}>
            {t('admin.appearance.previewEyebrow')}
          </p>
          <h3 className="mt-1 text-xl font-extrabold">{t('admin.appearance.previewHeading')}</h3>
          <p className="mt-1 text-sm text-gray-500">{t('admin.appearance.previewText')}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
              style={{ background: `linear-gradient(to bottom, rgb(${preset.shades[5]}), rgb(${preset.shades[6]}))` }}
            >
              <Icon name="cart" size={16} /> {t('admin.appearance.previewAddCart')}
            </span>
            <span
              className="inline-flex items-center rounded-xl px-4 py-2.5 text-sm font-semibold"
              style={{ background: `rgb(${preset.shades[0]})`, color: `rgb(${preset.shades[7]})` }}
            >
              {t('admin.appearance.previewSaveLater')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
