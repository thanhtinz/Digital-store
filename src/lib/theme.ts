// Runtime theming: brand colour, typeface and text size. The values become
// CSS variables that Tailwind's `brand-*` and `font-sans` utilities read, so
// changing a theme never requires touching a component.

export type ColorPreset = { key: string; name: string; shades: string[] };

// Shades are "R G B" triplets, 50 through 900, matching Tailwind's scale.
export const COLOR_PRESETS: ColorPreset[] = [
  {
    key: 'shopee',
    name: 'Shopee orange',
    shades: ['255 245 240', '255 233 224', '255 205 188', '255 168 140', '250 120 80', '242 90 50', '238 77 45', '214 58 32', '172 47 27', '140 40 24'],
  },
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
    key: 'teal',
    name: 'Teal',
    shades: ['240 253 250', '204 251 241', '153 246 228', '94 234 212', '45 212 191', '20 184 166', '13 148 136', '15 118 110', '17 94 89', '19 78 74'],
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

export type Dir = 'ltr' | 'rtl';

// Interface style: 'shopee' is the flat, square-cornered Shopee look;
// 'glass' restyles every surface as frosted Apple-style glass with large
// radii. It only flips CSS variables (see globals.css), never markup.
export type UiStyle = { key: string; name: string };

export const UI_STYLES: UiStyle[] = [
  { key: 'shopee', name: 'Shopee' },
  { key: 'glass', name: 'Apple glass' },
];

export const DEFAULT_THEME = { color: 'shopee', font: 'inter', textSize: 'normal', dir: 'ltr' as Dir, custom: '', style: 'shopee' };

export type Theme = { color: string; font: string; textSize: string; dir: Dir; custom: string; style: string };

const HEX_RE = /^#[0-9a-f]{6}$/i;

export function isValidHex(value: string | undefined | null): value is string {
  return !!value && HEX_RE.test(value);
}

// Derives a 50–900 shade scale from one hex colour: tints climb toward
// white, shades descend toward black, and the picked colour itself sits
// at 500/600 where most of the UI's emphasis lives.
export function shadesFromHex(hex: string): string[] {
  const n = parseInt(hex.slice(1), 16);
  const rgb: [number, number, number] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const mix = (target: number, amt: number) =>
    rgb.map((c) => Math.round(c + (target - c) * amt)).join(' ');
  return [
    mix(255, 0.94), // 50
    mix(255, 0.86), // 100
    mix(255, 0.68), // 200
    mix(255, 0.46), // 300
    mix(255, 0.22), // 400
    mix(0, 0),      // 500 — the picked colour itself
    mix(0, 0.1),    // 600
    mix(0, 0.2),    // 700
    mix(0, 0.32),   // 800
    mix(0, 0.44),   // 900
  ];
}

export function resolveTheme(store: Partial<Theme>, override?: Partial<Theme> | null): Theme {
  const pick = <T extends { key: string }>(list: T[], ...candidates: Array<string | undefined>) =>
    candidates.map((c) => list.find((x) => x.key === c)).find(Boolean) || list[0];

  // Colour resolves preset-first per candidate; 'custom' only wins when a
  // valid hex travels with it (from the same source, override before store).
  let color = DEFAULT_THEME.color;
  let custom = '';
  for (const candidate of [override?.color, store.color, DEFAULT_THEME.color]) {
    if (!candidate) continue;
    if (candidate === 'custom') {
      const hex = [override?.custom, store.custom].find(isValidHex);
      if (hex) {
        color = 'custom';
        custom = hex.toLowerCase();
        break;
      }
      continue;
    }
    const found = COLOR_PRESETS.find((x) => x.key === candidate);
    if (found) {
      color = found.key;
      break;
    }
  }

  return {
    color,
    custom,
    font: pick(FONT_PRESETS, override?.font, store.font, DEFAULT_THEME.font).key,
    textSize: pick(TEXT_SIZES, override?.textSize, store.textSize, DEFAULT_THEME.textSize).key,
    dir: (override?.dir ?? store.dir) === 'rtl' ? 'rtl' : 'ltr',
    style: pick(UI_STYLES, override?.style, store.style, DEFAULT_THEME.style).key,
  };
}

// Parses the visitor's ds_theme cookie: "color:font:size:dir:customHex:style".
// Older cookies carry fewer segments — those still parse, with the missing
// values falling back to the store's configured theme.
export function parseThemeCookie(raw: string | undefined): Partial<Theme> | null {
  if (!raw) return null;
  let decoded = raw;
  try { decoded = decodeURIComponent(raw); } catch { /* keep raw */ }
  const [color, font, textSize, dir, custom, style] = decoded.split(':');
  return {
    color,
    font,
    textSize,
    dir: dir === 'rtl' ? 'rtl' : dir === 'ltr' ? 'ltr' : undefined,
    custom: isValidHex(custom) ? custom : undefined,
    style: UI_STYLES.some((s) => s.key === style) ? style : undefined,
  };
}

export function serializeThemeCookie(theme: Theme): string {
  return encodeURIComponent(`${theme.color}:${theme.font}:${theme.textSize}:${theme.dir}:${theme.custom || ''}:${theme.style}`);
}

export function fontUrl(fontKey: string): string | null {
  const font = FONT_PRESETS.find((f) => f.key === fontKey);
  if (!font?.google) return null;
  return `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`;
}

// The :root block injected into <head>. Server-rendered, so the page never
// paints in the wrong colour before hydration.
export function themeCssVars(theme: Theme): string {
  const shades = theme.color === 'custom' && isValidHex(theme.custom)
    ? shadesFromHex(theme.custom)
    : (COLOR_PRESETS.find((c) => c.key === theme.color) || COLOR_PRESETS[0]).shades;
  const font = FONT_PRESETS.find((f) => f.key === theme.font) || FONT_PRESETS[0];
  const size = TEXT_SIZES.find((t) => t.key === theme.textSize) || TEXT_SIZES[1];
  const vars = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]
    .map((shade, i) => `--brand-${shade}:${shades[i]};`)
    .join('');
  // Tailwind sizes are all rem-based, so one root font-size scales everything.
  return `:root{${vars}--font-sans:${font.stack};font-size:${size.rootPx}px}`;
}
