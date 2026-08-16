'use client';

import { useSettings, toggle, SettingsHeader } from '../shared';
import { COLOR_PRESETS, FONT_PRESETS, TEXT_SIZES } from '@/lib/theme';
import Icon from '@/components/icons';

export default function AppearanceSettingsPage() {
  const { s, set, save, busy } = useSettings();
  if (!s) return <div className="py-16 text-center text-gray-400">Loading…</div>;

  const color = s.theme_color || 'indigo';
  const font = s.theme_font || 'inter';
  const size = s.theme_text_size || 'normal';
  const preset = COLOR_PRESETS.find((c) => c.key === color) || COLOR_PRESETS[0];

  return (
    <div className="space-y-6">
      <SettingsHeader
        title="Appearance"
        subtitle="The storefront's colour, typeface and text size. Changes apply everywhere as soon as you save."
        onSave={save}
        busy={busy}
      />

      <div className="card p-5">
        <h2 className="font-bold">Brand colour</h2>
        <p className="mt-0.5 text-sm text-gray-500">Used for buttons, links, highlights and focus rings.</p>
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
                {color === c.key && <Icon name="check" size={13} />} {c.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-bold">Typeface</h2>
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
              <span className="mt-0.5 block text-xs text-gray-500">{f.note || 'Loaded from Google Fonts'}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-bold">Text size</h2>
        <p className="mt-0.5 text-sm text-gray-500">Scales the whole interface, not just body copy.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {TEXT_SIZES.map((t) => (
            <button
              key={t.key}
              onClick={() => set('theme_text_size', t.key)}
              className={`rounded-xl border-2 p-4 text-left transition ${
                size === t.key ? 'border-gray-900' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="block font-bold" style={{ fontSize: t.rootPx }}>{t.name}</span>
              <span className="mt-0.5 block text-xs text-gray-500">Root size {t.rootPx}px</span>
            </button>
          ))}
        </div>
        <div className="mt-4">{toggle(s, set, 'theme_allow_override', 'Let visitors choose their own appearance')}</div>
        <p className="mt-1 text-xs text-gray-400">
          When on, shoppers get an appearance menu in the footer. Their choice is stored in their own browser and never
          changes what anyone else sees.
        </p>
      </div>

      {/* Live preview using the selected values directly, not the saved ones */}
      <div className="card p-5">
        <h2 className="font-bold">Preview</h2>
        <div
          className="mt-4 rounded-2xl border border-gray-200 p-6"
          style={{ fontFamily: `${FONT_PRESETS.find((f) => f.key === font)?.stack || 'Inter'}, system-ui` }}
        >
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: `rgb(${preset.shades[6]})` }}>
            Hand-picked
          </p>
          <h3 className="mt-1 text-xl font-extrabold">Featured products</h3>
          <p className="mt-1 text-sm text-gray-500">Instant delivery of premium digital goods.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
              style={{ background: `linear-gradient(to bottom, rgb(${preset.shades[5]}), rgb(${preset.shades[6]}))` }}
            >
              <Icon name="cart" size={16} /> Add to cart
            </span>
            <span
              className="inline-flex items-center rounded-xl px-4 py-2.5 text-sm font-semibold"
              style={{ background: `rgb(${preset.shades[0]})`, color: `rgb(${preset.shades[7]})` }}
            >
              Save for later
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
