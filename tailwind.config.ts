import type { Config } from 'tailwindcss';

// The brand palette is defined as CSS variables rather than fixed hex, so the
// admin can change the store's colour at runtime. Every existing `brand-600`
// style keeps working unchanged — only the definition moved.
const brand = Object.fromEntries(
  [50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => [
    shade,
    `rgb(var(--brand-${shade}) / <alpha-value>)`,
  ])
);

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { brand },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      container: {
        center: true,
        padding: { DEFAULT: '1rem', lg: '2rem' },
      },
    },
  },
  plugins: [],
};

export default config;
