/** @type {import('tailwindcss').Config} */

// ---- Optional DS scales (spacing/radii/type) ----
const scale = (() => {
  try { return require('./design-system/tokens/scale.js'); } catch { return {}; }
})();

// ---- Optional DS color map to merge (will be filtered to avoid collisions) ----
let dsColorsRaw = {};
try { dsColorsRaw = require('./design-system/tokens/colors.js') || {}; } catch {}

// Keys we reserve so DS colors won't override semantic surface keys we define below
const RESERVED_COLOR_KEYS = new Set([
  'bg', 'card', 'text', 'border',
  'background', 'foreground', 'card-foreground',
  'input', 'ring', 'muted', 'muted-foreground',
  'popover', 'popover-foreground',
  'primary', 'primaryDark', 'secondary', 'accent',
  'success', 'warning', 'danger'
]);

const dsColorsSafe = Object.fromEntries(
  Object.entries(dsColorsRaw).filter(([k]) => !RESERVED_COLOR_KEYS.has(k))
);

// helper to read CSS vars as rgb triplets while preserving slash-opacity utilities
const cv = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;

// ---- Optional plugins (loaded if installed; won’t crash if missing) ----
const maybe = (name) => {
  try { return require(name); } catch { return null; }
};

module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './stories/**/*.{js,ts,jsx,tsx,mdx}',
    './layouts/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
    './premium-ui/**/*.{js,ts,jsx,tsx,mdx}',
    // If you have an /app router, uncomment:
    // './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: { center: true, padding: '1rem' },
    extend: {
      colors: {
        // ---- Safe-merged DS brand palette (non-semantic keys from DS) ----
        ...dsColorsSafe,

        // ---- Semantic surface palette (hooks into styles/tokens.css) ----
        background:           cv('background'),
        foreground:           cv('foreground'),
        card:                 cv('lightCard'),
        'card-foreground':    cv('foreground'),
        border:               cv('lightBorder'),
        input:                cv('foreground'),
        ring:                 cv('foreground'),
        muted:                cv('grayish'),
        'muted-foreground':   cv('mutedText'),
        popover:              cv('background'),
        'popover-foreground': cv('foreground'),

        // ---- App brand palette (tokens) ----
        primary:        cv('primary'),
        primaryDark:    cv('primaryDark'),
        secondary:      cv('secondary'),
        accent:         cv('accent'),
        success:        cv('success'),
        warning:        cv('warning'),
        danger:         cv('danger'),

        // ---- Extras used around the app (tokens) ----
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
        glow: '0 10px 20px rgba(157,78,221,0.30)',
        glowLg: '0 20px 30px rgba(157,78,221,0.30)',
      },

      fontFamily: {
        sans: ['var(--font-sans)', 'Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        slab: ['var(--font-display)', 'Roboto Slab', 'serif'],
        poppins: ['Poppins', 'sans-serif'],
      },
    },
  },

  // ---- Turn on core plugins you rely on (defaults are fine) ----
  corePlugins: {
    // keep preflight unless you intentionally disabled it in globals
    preflight: true,
  },

  // ---- Optional Tailwind plugins (auto-skip if not installed) ----
  plugins: [
    ...[maybe('@tailwindcss/forms'), maybe('@tailwindcss/typography')].filter(Boolean),

    // Soft guardrail: warn (at build time) if arbitrary hex color utilities slip in.
    // This won’t fail builds (ESLint/Husky should), but it helps during dev.
    function arbitraryHexWarner({ addVariant }) {
      // No Tailwind hook to parse class strings; rely on env + console.warn once.
      const isCI = String(process.env.CI || '').toLowerCase() === 'true';
      if (isCI) return; // keep CI clean; enforce via lint/husky instead

      const printed = new Set();
      const warn = (msg) => {
        if (printed.has(msg)) return;
        printed.add(msg);
        // eslint-disable-next-line no-console
        console.warn(`[tailwind] ${msg}`);
      };

      // Emit a single reminder when Tailwind initializes
      warn('Use tokenized colors (bg-primary, text-danger, etc.). Avoid arbitrary hex like bg-[#ef4444]. Enforce in ESLint/Husky.');
    },
  ],
};
