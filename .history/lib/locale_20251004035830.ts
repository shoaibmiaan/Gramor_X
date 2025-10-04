// lib/locale.ts
// Minimal, typed, SSR-safe locale helpers + provider for the Pages Router

import * as React from 'react';

export type Locale = 'en' | 'ur' | 'ar' | 'fr';
const STORAGE_KEY = 'gx:locale';
const COOKIE_KEY = 'gx_locale';
const DEFAULT_LOCALE: Locale = 'en';

// Include common RTL scripts
const RTL_LOCALES = ['ur', 'ar', 'fa', 'he', 'ps'] as const;

let current: Locale | null = null;

// --- Cookie helpers (SSR-safe) ---
function readCookie(name: string, cookieString?: string): string | undefined {
  const source =
    cookieString ??
    (typeof document !== 'undefined' ? document.cookie : undefined);
  if (!source) return;
  const m = source.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : undefined;
}

function writeCookie(name: string, value: string, maxAgeSeconds = 60 * 60 * 24 * 30) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; path=/; max-age=${maxAgeSeconds}`;
}

// --- Detection ---
export function detectLocale(defaultLocale: Locale = DEFAULT_LOCALE, opts?: {
  cookieString?: string;           // SSR: request.headers.cookie
  acceptLanguageHeader?: string;   // SSR: request.headers['accept-language']
}): Locale {
  // 1) Cookie (server or browser)
  const fromCookie = readCookie(COOKIE_KEY, opts?.cookieString);
  if (fromCookie && ['en', 'ur', 'ar', 'fr'].includes(fromCookie)) {
    return fromCookie as Locale;
  }

  // 2) Browser (only client)
  if (typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved && ['en', 'ur', 'ar', 'fr'].includes(saved)) return saved;
    } catch {/* ignore */}
    const htmlLang = document?.documentElement?.getAttribute('lang');
    if (htmlLang && ['en', 'ur', 'ar', 'fr'].includes(htmlLang)) {
      return htmlLang as Locale;
    }
    const nav = (navigator?.languages && navigator.languages[0]) || navigator?.language;
    if (nav) {
      const code = nav.slice(0, 2).toLowerCase();
      if (['en', 'ur', 'ar', 'fr'].includes(code)) return code as Locale;
    }
  }

  // 3) SSR Accept-Language
  const h = (opts?.acceptLanguageHeader || '').toLowerCase();
  if (h.includes('ur')) return 'ur';
  if (h.includes('ar')) return 'ar';
  if (h.includes('fr')) return 'fr';
  if (h.includes('en')) return 'en';

  return defaultLocale;
}

// Back-compat alias for consumers importing `_detectLocale`
export const _detectLocale = detectLocale;

// --- Getters / Setters ---
export function getLocale(defaultLocale: Locale = DEFAULT_LOCALE): Locale {
  if (current) return current;
  current = detectLocale(defaultLocale);
  return current;
}

export function setLocale(next: Locale) {
  current = next;

  // Persist to cookie + localStorage when available
  writeCookie(COOKIE_KEY, next);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {/* ignore */}
  }

  // Reflect in <html> attributes for a11y and layout direction
  if (typeof document !== 'undefined') {
    try {
      document.documentElement.setAttribute('lang', next);
      const isRTL = (l: string) => (RTL_LOCALES as readonly string[]).includes(l.toLowerCase());
      document.documentElement.setAttribute('dir', isRTL(next) ? 'rtl' : 'ltr');
    } catch {/* ignore */}
  }

  // Notify listeners (e.g., other tabs)
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('locale:changed', { detail: next }));
    } catch {/* ignore */}
  }
}

// Named export expected by other modules (used as `import { persistLocale as setLocale } ...`)
export const persistLocale = setLocale;

// --- React hook ---
/** React hook: returns [locale, setLocale] */
export function useLocale(defaultLocale: Locale = DEFAULT_LOCALE) {
  const [locale, setLocal] = React.useState<Locale>(() => getLocale(defaultLocale));

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setLocal(e.newValue as Locale);
      }
    };
    const onCustom = (e: Event) => {
      const l = (e as CustomEvent).detail as Locale | undefined;
      if (l) setLocal(l);
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('locale:changed', onCustom as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('locale:changed', onCustom as EventListener);
    };
  }, []);

  const update = React.useCallback((next: Locale) => {
    setLocale(next);
    setLocal(next);
  }, []);

  return [locale, update] as const;
}

// --- Lightweight Provider (keeps your `_app.tsx` happy) ---
export function LanguageProvider({
  children,
  initialLocale,
}: React.PropsWithChildren<{ initialLocale?: Locale }>) {
  // Ensure html attributes & storage reflect the initial locale ASAP
  React.useEffect(() => {
    const l = getLocale(initialLocale ?? DEFAULT_LOCALE);
    setLocale(l);
  }, [initialLocale]);

  return <>{children}</>;
}
