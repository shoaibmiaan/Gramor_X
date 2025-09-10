// lib/locale.ts
// Minimal locale helper for Pages Router (SSR-safe)

export type Locale = 'en' | 'ur' | 'ar' | 'fr'; // add/remove as needed
const STORAGE_KEY = 'locale';

let current: Locale | null = null;

// Best-effort detector (client only), with sensible fallbacks.
export function detectLocale(defaultLocale: Locale = 'en'): Locale {
  // 1) explicit saved choice
  if (typeof window !== 'undefined') {
    const saved = (localStorage.getItem(STORAGE_KEY) as Locale | null) ?? null;
    if (saved) return saved;

    // 2) <html lang="...">
    const htmlLang =
      (document?.documentElement?.getAttribute('lang') as Locale | null) ?? null;
    if (htmlLang) return htmlLang;

    // 3) navigator languages
    const nav = navigator?.languages?.[0] || navigator?.language;
    if (nav) {
      const code = nav.slice(0, 2).toLowerCase();
      const supported: Locale[] = ['en', 'ur', 'ar', 'fr'];
      const hit = supported.find(l => l === (code as Locale));
      if (hit) return hit;
    }
  }

  // 4) server or nothing matched
  return defaultLocale;
}

// SSR-safe getter
export function getLocale(defaultLocale: Locale = 'en'): Locale {
  if (typeof window === 'undefined') return current ?? defaultLocale;

  // Prefer cached in-memory state, else saved, else detected
  const saved = (localStorage.getItem(STORAGE_KEY) as Locale | null) ?? null;
  current = current ?? saved ?? detectLocale(defaultLocale);

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
    localStorage.setItem(STORAGE_KEY, next);
    try {
      document.documentElement.setAttribute('lang', next);
    } catch {}
  }
}

// (Optional) Load translation JSON into a global cache (client only).
// Adjust the fetch path to your actual public JSON files.
type Dict = Record<string, string>;
declare global {
  interface Window { __i18n?: Record<Locale, Dict>; }
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
