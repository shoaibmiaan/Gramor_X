/** @type {import('tailwindcss').Config} */
const plugin = require('tailwindcss/plugin');

module.exports = {
  prefix: 'pr-',
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './premium-ui/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',          // in case any premium UI lives in `app/`
  ],
  theme: {
    extend: {
      borderRadius: {
        xl: 'var(--pr-radius)',
        '2xl': 'calc(var(--pr-radius) + 8px)',
      },
      boxShadow: {
        md: 'var(--pr-shadow-md)',
        lg: 'var(--pr-shadow-lg)',
      },
      fontSize: {
        h2: ['28px', { lineHeight: '1.2', fontWeight: '600' }],
        h5: ['18px', { lineHeight: '1.25', fontWeight: '600' }],
        small: ['12px', { lineHeight: '1.3' }],
      },
    },
  },

  /**
   * Important: we keep preflight off to avoid touching your global DS,
   * but we still need Tailwind's CSS variables so ring/shadow/etc. work.
   */
  corePlugins: {
    preflight: false,
  },

  /**
   * Safelist the exact arbitrary-value utilities used in your Premium pages.
   * (You can add more here as you introduce new variants/values.)
   */
  safelist: [
    // colors from CSS variables
    'pr-bg-[var(--pr-card)]',
    'pr-text-[var(--pr-danger)]',
    'pr-border-[var(--pr-border)]',
    'pr-ring-[var(--pr-primary)]',
    'focus:pr-ring-[var(--pr-primary)]',
    'focus:pr-border-[var(--pr-primary)]',

    // color-mix based surfaces (use underscores in place of spaces)
    'pr-bg-[color-mix(in_oklab,var(--pr-primary),var(--pr-bg)_88%)]',
    'hover:pr-bg-[color-mix(in_oklab,var(--pr-fg),var(--pr-bg)_94%)]',
    'pr-bg-[color-mix(in_oklab,var(--pr-danger),var(--pr-bg)_85%)]',

    // sizing & layout arbitrary values seen on pages
    'pr-min-h-[100dvh]',
    'pr-bottom-[max(1rem,env(safe-area-inset-bottom))]',
    'pr-top-[max(1rem,env(safe-area-inset-top))]',
  ],

  plugins: [
    /**
     * Minimal Tailwind var bootstrap (so ring/shadow/transform utilities work
     * even with preflight disabled). This mirrors Tailwind’s preflight var init,
     * without resetting any element styles.
     */
    plugin(function ({ addBase }) {
      addBase({
        '*,::before,::after': {
          '--tw-border-spacing-x': '0',
          '--tw-border-spacing-y': '0',
          '--tw-translate-x': '0',
          '--tw-translate-y': '0',
          '--tw-rotate': '0',
          '--tw-skew-x': '0',
          '--tw-skew-y': '0',
          '--tw-scale-x': '1',
          '--tw-scale-y': '1',
          '--tw-pan-x': ' ',
          '--tw-pan-y': ' ',
          '--tw-pinch-zoom': ' ',
          '--tw-scroll-snap-strictness': 'proximity',
          '--tw-gradient-from-position': ' ',
          '--tw-gradient-via-position': ' ',
          '--tw-gradient-to-position': ' ',
          '--tw-ordinal': ' ',
          '--tw-slashed-zero': ' ',
          '--tw-numeric-figure': ' ',
          '--tw-numeric-spacing': ' ',
          '--tw-numeric-fraction': ' ',
          '--tw-ring-inset': ' ',
          '--tw-ring-offset-width': '0px',
          '--tw-ring-offset-color': '#fff',
          '--tw-ring-color': 'rgb(59 130 246 / 0.5)',
          '--tw-ring-offset-shadow': '0 0 #0000',
          '--tw-ring-shadow': '0 0 #0000',
          '--tw-shadow': '0 0 #0000',
          '--tw-shadow-colored': '0 0 #0000',
          '--tw-blur': ' ',
          '--tw-brightness': ' ',
          '--tw-contrast': ' ',
          '--tw-grayscale': ' ',
          '--tw-hue-rotate': ' ',
          '--tw-invert': ' ',
          '--tw-saturate': ' ',
          '--tw-sepia': ' ',
          '--tw-drop-shadow': ' ',
          '--tw-backdrop-blur': ' ',
          '--tw-backdrop-brightness': ' ',
          '--tw-backdrop-contrast': ' ',
          '--tw-backdrop-grayscale': ' ',
          '--tw-backdrop-hue-rotate': ' ',
          '--tw-backdrop-invert': ' ',
          '--tw-backdrop-opacity': ' ',
          '--tw-backdrop-saturate': ' ',
          '--tw-backdrop-sepia': ' ',
        },
      });
    }),
  ],
};