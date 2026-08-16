// Runtime theming: brand colour, typeface and text size. The values become
// CSS variables that Tailwind's `brand-*` and `font-sans` utilities read, so
// changing a theme never requires touching a component.

export type ColorPreset = { key: string; name: string; shades: string[] };

// Shades are "R G B" triplets, 50 through 900, matching Tailwind's scale.
export const COLOR_PRESETS: ColorPreset[] = [
  {
    key: 'indigo',
    name: 'Indigo',
    shades: ['238 242 255', '224 231 255', '199 210 254', '165 180 252', '129 140 248', '99 102 241', '79 70 229', '67 56 202', '55 48 163', '49 46 129'],
  },
  {
    key: 'blue',
    name: 'Ocean blue',
    shades: ['239 246 255', '219 234 254', '191 219 254', '147 197 253', '96 165 250', '59 130 246', '37 99 235', '29 78 216', '30 64 175', '30 58 138'],
  },
  {
    key: 'emerald',
    name: 'Emerald',
    shades: ['236 253 245', '209 250 229', '167 243 208', '110 231 183', '52 211 153', '16 185 129', '5 150 105', '4 120 87', '6 95 70', '6 78 59'],
  },
  {
    key: 'violet',
    name: 'Violet',
    shades: ['245 243 255', '237 233 254', '221 214 254', '196 181 253', '167 139 250', '139 92 246', '124 58 237', '109 40 217', '91 33 182', '76 29 149'],
  },
  {
    key: 'rose',
    name: 'Rose',
    shades: ['255 241 242', '255 228 230', '254 205 211', '253 164 175', '251 113 133', '244 63 94', '225 29 72', '190 18 60', '159 18 57', '136 19 55'],
  },
  {
    key: 'amber',
    name: 'Amber',
    shades: ['255 251 235', '254 243 199', '253 230 138', '252 211 77', '251 191 36', '245 158 11', '217 119 6', '180 83 9', '146 64 14', '120 53 15'],
  },
];

export type FontPreset = { key: string; name: string; stack: string; google: string | null; note?: string };

export const FONT_PRESETS: FontPreset[] = [
  { key: 'inter', name: 'Inter', stack: "'Inter'", google: 'Inter:wght@400;500;600;700;800' },
  { key: 'manrope', name: 'Manrope', stack: "'Manrope'", google: 'Manrope:wght@400;500;600;700;800' },
  { key: 'roboto', name: 'Roboto', stack: "'Roboto'", google: 'Roboto:wght@400;500;700;900' },
  {
    key: 'be-vietnam',
    name: 'Be Vietnam Pro',
    stack: "'Be Vietnam Pro'",
    google: 'Be+Vietnam+Pro:wght@400;500;600;700;800',
    note: 'Designed for Vietnamese diacritics',
  },
  { key: 'system', name: 'System default', stack: 'system-ui', google: null, note: 'Loads nothing — fastest' },
];

export type TextSize = { key: string; name: string; rootPx: number };

export const TEXT_SIZES: TextSize[] = [
  { key: 'small', name: 'Compact', rootPx: 15 },
  { key: 'normal', name: 'Normal', rootPx: 16 },
  { key: 'large', name: 'Large', rootPx: 17.5 },
];

export const DEFAULT_THEME = { color: 'indigo', font: 'inter', textSize: 'normal' };

export type Theme = { color: string; font: string; textSize: string };

export function resolveTheme(store: Partial<Theme>, override?: Partial<Theme> | null): Theme {
  const pick = <T extends { key: string }>(list: T[], ...candidates: Array<string | undefined>) =>
    candidates.map((c) => list.find((x) => x.key === c)).find(Boolean) || list[0];
  return {
    color: pick(COLOR_PRESETS, override?.color, store.color, DEFAULT_THEME.color).key,
    font: pick(FONT_PRESETS, override?.font, store.font, DEFAULT_THEME.font).key,
    textSize: pick(TEXT_SIZES, override?.textSize, store.textSize, DEFAULT_THEME.textSize).key,
  };
}

// Parses the visitor's ds_theme cookie: "color:font:size".
export function parseThemeCookie(raw: string | undefined): Partial<Theme> | null {
  if (!raw) return null;
  const [color, font, textSize] = raw.split(':');
  return { color, font, textSize };
}

export function serializeThemeCookie(theme: Theme): string {
  return `${theme.color}:${theme.font}:${theme.textSize}`;
}

export function fontUrl(fontKey: string): string | null {
  const font = FONT_PRESETS.find((f) => f.key === fontKey);
  if (!font?.google) return null;
  return `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`;
}

// The :root block injected into <head>. Server-rendered, so the page never
// paints in the wrong colour before hydration.
export function themeCssVars(theme: Theme): string {
  const color = COLOR_PRESETS.find((c) => c.key === theme.color) || COLOR_PRESETS[0];
  const font = FONT_PRESETS.find((f) => f.key === theme.font) || FONT_PRESETS[0];
  const size = TEXT_SIZES.find((t) => t.key === theme.textSize) || TEXT_SIZES[1];
  const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]
    .map((shade, i) => `--brand-${shade}:${color.shades[i]};`)
    .join('');
  // Tailwind sizes are all rem-based, so one root font-size scales everything.
  return `:root{${shades}--font-sans:${font.stack};font-size:${size.rootPx}px}`;
}
