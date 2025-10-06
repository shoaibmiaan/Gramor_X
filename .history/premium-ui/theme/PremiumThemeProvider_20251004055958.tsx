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

type Props = { children: ReactNode; initialTheme?: PremiumThemeId; animatedBackground?: boolean };

export function PremiumThemeProvider({ children, initialTheme, animatedBackground = true }: Props) {
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
      {/* contains the page, no unintended layout */}
      <div className="pr-min-h-[100dvh] pr-bg-[var(--pr-bg)] pr-text-[var(--pr-fg)]">
        {/* Animated luxury backdrop (theme-aware). Renders once for all /premium pages. */}
        {animatedBackground ? (
          <div className="lux-outer" aria-hidden="true">
            <div className="lux-inner" />
          </div>
        ) : null}

        {children}
      </div>
    </ThemeCtx.Provider>
  );
}
