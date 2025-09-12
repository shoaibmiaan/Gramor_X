/** @type {import('tailwindcss').Config} */

// Optional DS scales (spacing/radii/type)
const scale = (() => {
  try { return require('./design-system/tokens/scale.js'); } catch { return {}; }
})();

// Optional DS color map to merge (will be filtered to avoid collisions)
let dsColorsRaw = {};
try { dsColorsRaw = require('./design-system/tokens/colors.js') || {}; } catch {}

// Keys we reserve so DS colors won't override them
const RESERVED_COLOR_KEYS = new Set([
  'bg','card','text','border',
  'background','foreground','card-foreground',
  'input','ring','muted','muted-foreground',
  'popover','popover-foreground',
]);

const dsColorsSafe = Object.fromEntries(
  Object.entries(dsColorsRaw).filter(([k]) => !RESERVED_COLOR_KEYS.has(k))
);

// helper to read CSS vars as rgb triplets while preserving slash-opacity utilities
const cv = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;

module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './stories/**/*.{js,ts,jsx,tsx,mdx}',
    // Include 'app' only if you actually have the directory:
    // './app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Safe-merged DS colors (won't collide with semantic keys below)
        ...dsColorsSafe,

        // Semantic surface palette (hooks into styles/tokens.css)
        background:           cv('background'),
        foreground:           cv('foreground'),
        'card-foreground':    cv('foreground'),
        input:                cv('foreground'),
        ring:                 cv('foreground'),
        muted:                cv('grayish'),
        'muted-foreground':   cv('mutedText'),
        popover:              cv('background'),
        'popover-foreground': cv('foreground'),

        // App brand palette
        primary:        cv('primary'),
        primaryDark:    cv('primaryDark'),
        secondary:      cv('secondary'),
        accent:         cv('accent'),
        success:        cv('success'),

        // Extras used around the app
        purpleVibe:     cv('purpleVibe'),
        vibrantPurple:  cv('vibrantPurple'),
        electricBlue:   cv('electricBlue'),
        neonGreen:      cv('neonGreen'),
        sunsetOrange:   cv('sunsetOrange'),
        sunsetRed:      cv('sunsetRed'),
        goldenYellow:   cv('goldenYellow'),

        dark:           cv('dark'),
        darker:         cv('darker'),
        lightBg:        cv('lightBg'),
        lightText:      cv('lightText'),
        grayish:        cv('grayish'),
        lightCard:      cv('lightCard'),
        lightBorder:    cv('lightBorder'),
        mutedText:      cv('mutedText'),
      },

      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        '2xl': 'var(--radius-2xl)',
        // DS scale passthroughs (if provided)
        ds: scale?.radius?.lg,
        'ds-xl': scale?.radius?.xl,
        'ds-2xl': scale?.radius?.['2xl'],
      },

      spacing: {
        1: 'var(--space-1)',
        2: 'var(--space-2)',
        3: 'var(--space-3)',
        4: 'var(--space-4)',
        6: 'var(--space-6)',
        8: 'var(--space-8)',
        ...(scale?.spacing || {}),
      },

      fontSize: {
        ...(scale?.typeScale || {}),
      },

      boxShadow: {
        sm: 'var(--shadow-1)',
        md: 'var(--shadow-2)',
        glow: '0 10px 20px rgba(157,78,221,0.3)',
        glowLg: '0 20px 30px rgba(157,78,221,0.3)',
      },

      fontFamily: {
        sans: ['var(--font-sans)', 'Poppins', 'ui-sans-serif'],
        slab: ['var(--font-display)', 'Roboto Slab', 'serif'],
        poppins: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
