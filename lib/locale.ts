// Minimal locale helper for Pages Router (SSR-safe)
import * as React from 'react';

export type Locale = 'en' | 'ur' | 'ar' | 'fr';
const STORAGE_KEY = 'locale';
const RTL_LOCALES = ['ur','ar','fa','he','ps'] as const;

let current: Locale | null = null;

export function detectLocale(defaultLocale: Locale = 'en'): Locale {
  if (typeof window !== 'undefined') {
    try {
      const saved = (window.localStorage.getItem(STORAGE_KEY) as Locale | null) ?? null;
      if (saved) return saved;
    } catch {}
    const htmlLang = (document?.documentElement?.getAttribute('lang') as Locale | null) ?? null;
    if (htmlLang) return htmlLang;
    const nav = (navigator?.languages && navigator.languages[0]) || navigator?.language;
    if (nav) {
      const code = nav.slice(0,2).toLowerCase();
      if (['en','ur','ar','fr'].includes(code)) return code as Locale;
    }
  }
  return defaultLocale;
}

export function getLocale(defaultLocale: Locale = 'en'): Locale {
  if (current) return current;
  current = detectLocale(defaultLocale);
  return current;
}

export function setLocale(next: Locale) {
  current = next;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    try {
      document.documentElement.setAttribute('lang', next);
      const isRTL = (l: string) => (RTL_LOCALES as readonly string[]).includes(l.toLowerCase());
      document.documentElement.setAttribute('dir', isRTL(next) ? 'rtl' : 'ltr');
    } catch {}
    try {
      window.dispatchEvent(new CustomEvent('locale:changed', { detail: next }));
    } catch {}
  }
}

/** React hook: returns [locale, setLocale] */
export function useLocale(defaultLocale: Locale = 'en') {
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
