/** @type {import('tailwindcss').Config} */

const scale = (() => {
  try { return require('./design-system/tokens/scale.js'); } catch { return {}; }
})();

let dsColorsRaw = {};
try { dsColorsRaw = require('./design-system/tokens/colors.js') || {}; } catch {}

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

const cv = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;

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
  ],
  theme: {
    container: { center: true, padding: '1rem' },
    extend: {
      colors: {
        ...dsColorsSafe,
        background:           cv('background'),
        foreground:           cv('foreground'),
        card:                 'rgb(var(--gx-card) / <alpha-value>)',
        'card-foreground':    'rgb(var(--gx-card-foreground) / <alpha-value>)',
        border:               'rgb(var(--gx-border) / <alpha-value>)',
        input:                'rgb(var(--gx-input) / <alpha-value>)',
        ring:                 'rgb(var(--gx-ring) / <alpha-value>)',
        muted:                'rgb(var(--gx-muted) / <alpha-value>)',
        'muted-foreground':   'rgb(var(--gx-muted-foreground) / <alpha-value>)',
        popover:              'rgb(var(--gx-popover) / <alpha-value>)',
        'popover-foreground': 'rgb(var(--gx-popover-foreground) / <alpha-value>)',
        primary:        cv('primary'),
        primaryDark:    cv('primaryDark'),
        secondary:      cv('secondary'),
        accent:         cv('accent'),
        success:        cv('success'),
        warning:        cv('warning'),
        danger:         cv('danger'),
        purpleVibe:     cv('purpleVibe'),
        vibrantPurple:  cv('vibrantPurple'),
        electricBlue:   cv('electricBlue'),
        neonGreen:      cv('neonGreen'),
        sunsetOrange:   cv('sunsetOrange'),
        sunsetRed:      cv('sunsetRed'),
        goldenYellow:   cv('goldenYellow'),
        dark:           cv('dark'),
        darker:         cv('darker'),
        nightStart:     cv('nightStart'),
        nightMid:       cv('nightMid'),
        nightEnd:       cv('nightEnd'),
        lightBg:        cv('lightBg'),
        lightText:      cv('lightText'),
        grayish:        cv('grayish'),
        lightCard:      cv('lightCard'),
        lightBorder:    cv('lightBorder'),
        mutedText:      cv('mutedText'),
        neutral:        'rgb(var(--color-gray) / <alpha-value>)',  // Added 'neutral' color variant
        chart: {
          reading: 'rgb(var(--gx-chart-reading) / <alpha-value>)',
          listening: 'rgb(var(--gx-chart-listening) / <alpha-value>)',
          writing: 'rgb(var(--gx-chart-writing) / <alpha-value>)',
          speaking: 'rgb(var(--gx-chart-speaking) / <alpha-value>)',
          grid: 'rgb(var(--gx-chart-grid) / <alpha-value>)',
          axis: 'rgb(var(--gx-chart-axis) / <alpha-value>)',
          tooltip: {
            bg: 'rgb(var(--gx-chart-tooltip-bg) / <alpha-value>)',
            border: 'rgb(var(--gx-chart-tooltip-border) / <alpha-value>)',
            fg: 'rgb(var(--gx-chart-tooltip-fg) / <alpha-value>)',
          },
        },
        focus: {
          ring: 'rgb(var(--gx-focus-ring) / <alpha-value>)',
          strong: 'rgb(var(--gx-focus-ring-strong) / <alpha-value>)',
          muted: 'rgb(var(--gx-focus-ring-muted) / <alpha-value>)',
        },
        certificate: {
          background: 'rgb(var(--gx-card) / <alpha-value>)',
          border: 'rgb(var(--gx-border) / <alpha-value>)',
          accent: cv('primary'),
          text: 'rgb(var(--gx-foreground) / <alpha-value>)',
        },
      },

      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        '2xl': 'var(--radius-2xl)',
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

  corePlugins: {
    preflight: true,
  },

  plugins: [
    ...[maybe('@tailwindcss/forms'), maybe('@tailwindcss/typography')].filter(Boolean),

    function arbitraryHexWarner() {
      const isCI = String(process.env.CI || '').toLowerCase() === 'true';
      if (isCI) return;

      const globalKey = '__tailwindHexWarnings';
      const globalState = globalThis;
      if (!globalState[globalKey]) {
        globalState[globalKey] = new Set();
      }

      const fs = require('fs');
      const path = require('path');

      const roots = ['components', 'pages', 'layouts', 'lib', 'styles', 'premium-ui'];
      const HEX_PATTERN = /(?:bg|text|border)-\[#(?:[0-9a-fA-F]{6})\]/g;
      const matches = new Set();

      const visit = (target) => {
        let entries = [];
        try {
          entries = fs.readdirSync(target, { withFileTypes: true });
        } catch {
          return;
        }

        for (const entry of entries) {
          if (entry.name.startsWith('.')) continue;
          const resolved = path.join(target, entry.name);
          if (entry.isDirectory()) {
            if (['node_modules', '.next', 'dist', 'out', 'coverage'].includes(entry.name)) continue;
            visit(resolved);
            continue;
          }

          const ext = path.extname(entry.name);
          if (!['.ts', '.tsx', '.js', '.jsx', '.css', '.mdx', '.html'].includes(ext)) continue;

          let content = '';
          try {
            content = fs.readFileSync(resolved, 'utf8');
          } catch {
            continue;
          }

          const found = content.match(HEX_PATTERN);
          if (found) {
            found.forEach((match) => matches.add(`${match} (${path.relative(__dirname, resolved)})`));
          }
        }
      };

      roots.forEach((root) => {
        const fullPath = path.join(__dirname, root);
        if (fs.existsSync(fullPath)) {
          visit(fullPath);
        }
      });

      if (matches.size === 0) return;

      const offenders = Array.from(matches).slice(0, 5).join(', ');
      const message =
        'Use tokenized colors (bg-primary, text-danger, etc.). Avoid arbitrary hex like bg-[#ef4444]. ' +
        (matches.size > 5
          ? `Found offenders: ${offenders}, …`
          : `Found offenders: ${offenders}`);

      if (!globalState[globalKey].has(message)) {
        globalState[globalKey].add(message);
        console.warn(`[tailwind] ${message}`);
      }
    },
  ],
};
