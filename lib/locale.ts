// lib/locale.ts
// Minimal locale helper for Pages Router (SSR-safe)

export type Locale = 'en' | 'ur' | 'ar' | 'fr'; // adjust as needed
const STORAGE_KEY = 'locale';
const SUPPORTED: ReadonlyArray<Locale> = ['en', 'ur', 'ar', 'fr'];

let current: Locale | null = null;

// Best-effort detector (client only), with sensible fallbacks.
export function detectLocale(defaultLocale: Locale = 'en'): Locale {
  if (typeof window !== 'undefined') {
    // 1) explicit saved choice
    const saved = (localStorage.getItem(STORAGE_KEY) as Locale | null) ?? null;
    if (saved && SUPPORTED.includes(saved)) return saved;

    // 2) <html lang="...">
    const htmlLang =
      (document?.documentElement?.getAttribute('lang') as Locale | null) ?? null;
    if (htmlLang && SUPPORTED.includes(htmlLang)) return htmlLang;

    // 3) navigator languages
    const nav = navigator?.languages?.[0] || navigator?.language;
    if (nav) {
      const code = nav.slice(0, 2).toLowerCase() as Locale;
      if (SUPPORTED.includes(code)) return code;
    }
  }

  // 4) server or nothing matched
  return defaultLocale;
}

// SSR-safe getter
export function getLocale(defaultLocale: Locale = 'en'): Locale {
  if (typeof window === 'undefined') return (current as Locale) ?? defaultLocale;

  const saved = (localStorage.getItem(STORAGE_KEY) as Locale | null) ?? null;
  current = current ?? (saved && SUPPORTED.includes(saved) ? saved : null) ?? detectLocale(defaultLocale);

  // Ensure <html lang> reflects current on the client
  try {
    document.documentElement.setAttribute('lang', current);
  } catch {}
  return current;
}

// Persist + update <html lang="">
export function setLocale(next: Locale): void {
  current = next;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.setAttribute('lang', next);
    } catch {
      /* noop */
    }
  }
}

// Detect best locale from a hint / browser (SSR-safe)
export function detectLocaleFromHint(hint?: string, fallback: Locale = 'en'): Locale {
  if (hint && typeof hint === 'string') {
    const code = hint.split('-')[0].toLowerCase() as Locale;
    if (SUPPORTED.includes(code)) return code;
  }
  if (typeof navigator !== 'undefined') {
    const nav =
      (navigator.languages && navigator.languages[0]) ||
      navigator.language ||
      (navigator as any).userLanguage ||
      fallback;
    const code = String(nav).split('-')[0].toLowerCase() as Locale;
    if (SUPPORTED.includes(code)) return code;
  }
  return (current as Locale) ?? fallback;
}

// (Optional) translation cache on client
type Dict = Record<string, string>;
declare global {
  interface Window {
    __i18n?: Record<Locale, Dict>;
  }
}

export async function loadTranslations(next: Locale): Promise<Dict> {
  if (typeof window === 'undefined') return {};
  window.__i18n = window.__i18n ?? {};
  if (window.__i18n[next]) return window.__i18n[next];

  try {
    const res = await fetch(`/locales/${next}.json`, { cache: 'force-cache' });
    if (!res.ok) return {};
    const dict = (await res.json()) as Dict;
    window.__i18n[next] = dict;
    return dict;
  } catch {
    return {};
  }
}
