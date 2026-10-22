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
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        // Layered, soft elevation scale used across cards, menus and chrome.
        card: '0 1px 2px rgba(16, 24, 40, 0.04), 0 8px 24px -16px rgba(16, 24, 40, 0.12)',
        'card-hover': '0 2px 4px rgba(16, 24, 40, 0.05), 0 24px 44px -20px rgba(16, 24, 40, 0.22)',
        pop: '0 12px 32px -12px rgba(16, 24, 40, 0.25), 0 2px 6px rgba(16, 24, 40, 0.06)',
        glow: '0 0 0 1px rgb(var(--brand-500) / 0.25), 0 12px 32px -12px rgb(var(--brand-600) / 0.45)',
        'btn-primary':
          '0 10px 24px -10px rgb(var(--brand-600) / 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.22)',
        'btn-primary-hover':
          '0 14px 30px -10px rgb(var(--brand-600) / 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '180% 0' },
          '100%': { backgroundPosition: '-20% 0' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(4px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up .6s cubic-bezier(.22, 1, .36, 1) both',
        'fade-in': 'fade-in .5s ease-out both',
        shimmer: 'shimmer 1.6s linear infinite',
        'scale-in': 'scale-in .18s ease-out both',
        'slide-in-left': 'slide-in-left .28s cubic-bezier(.22, 1, .36, 1) both',
        float: 'float 7s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
