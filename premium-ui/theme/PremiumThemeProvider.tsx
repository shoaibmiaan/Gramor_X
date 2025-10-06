import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { PREMIUM_THEMES, type PremiumThemeId } from './premium-themes';

type ThemeCtxValue = { theme: PremiumThemeId; setTheme: (t: PremiumThemeId) => void };
const ThemeCtx = createContext<ThemeCtxValue | null>(null);
const STORAGE_KEY = 'pr-theme';

function normalizeTheme(raw?: string | null): PremiumThemeId {
  if (!raw) return 'carbon';
  const val = raw.toLowerCase();
  if (val === 'dark') return 'carbon';
  if (val === 'light') return 'ivory';
  if (val === 'gold') return 'royal';
  if (['carbon', 'ivory', 'royal', 'aurora'].includes(val)) return val as PremiumThemeId;
  return 'carbon';
}

export function usePremiumTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error('usePremiumTheme must be used inside <PremiumThemeProvider>');
  return ctx;
}

type Props = {
  children: ReactNode;
  initialTheme?: PremiumThemeId;

  /** Where the global “Leave Premium” button navigates. Defaults to "/" */
  exitHref?: string;

  /** Hide the global button (rare). Defaults to false */
  hideExitButton?: boolean;
};

export function PremiumThemeProvider({
  children,
  initialTheme,
  exitHref = '/',
  hideExitButton = false,
}: Props) {
  const [theme, setTheme] = useState<PremiumThemeId>(() =>
    normalizeTheme(
      initialTheme ||
        (typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : 'carbon'),
    ),
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.setAttribute('data-pr-theme', theme);
      root.classList.add('pr-themed');
    }
  }, [theme]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setTheme(normalizeTheme(e.newValue));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return (
    <ThemeCtx.Provider value={value}>
      {/* Keep transparent so animated layer is visible */}
      <div className="pr-min-h-[100dvh] pr-text-[var(--pr-fg)] pr-relative pr-isolate">
        {/* Animated background behind everything */}
        <div className="lux-bg" aria-hidden />
        {/* optional extra sheet for depth */}
        <div className="lux-sheet" aria-hidden />

        {/* Foreground content */}
        <div className="pr-relative" style={{ zIndex: 1 }}>
          {children}
        </div>

        {/* Global “Leave Premium” button (bottom-left) */}
        {!hideExitButton && (
          <a
            href={exitHref}
            className="pr-exit-btn"
            aria-label="Exit Premium (Back to Portal)"
            title="Back to Portal"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="pr-mr-2 pr-shrink-0"
            >
              <path
                d="M10.5 6l-6 6 6 6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M20 12H5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <span>Back to Portal</span>
          </a>
        )}
      </div>
    </ThemeCtx.Provider>
  );
}
