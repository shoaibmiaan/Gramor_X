import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { defaultLocale, supportedLocales, type SupportedLocale } from '@/lib/i18n/config';

export type Locale = SupportedLocale;
export type Messages = Record<string, any>;

const STORAGE_KEY = 'gramor:locale';
const rtlLocales = new Set<Locale>(['ur']);

const registry: Record<string, Messages> = {};
let currentLocale: Locale = defaultLocale;

function deepMerge(target: Messages, source: Messages): Messages {
  const result = { ...target } as Messages;
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = deepMerge((target[key] as Messages) ?? {}, value as Messages);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function toSupported(value?: string | null): Locale {
  if (!value) return defaultLocale;
  const normalised = value.toLowerCase().split('-')[0];
  return (supportedLocales as string[]).includes(normalised) ? (normalised as Locale) : defaultLocale;
}

export const toSupportedLocale = toSupported;

function applyDocumentAttributes(locale: Locale) {
  if (typeof document === 'undefined') return;
  const dir = rtlLocales.has(locale) ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = locale;
}

function get(obj: any, path: string) {
  return path.split('.').reduce((acc, part) => (acc != null ? acc[part] : undefined), obj);
}

export function registerMessages(locale: string, messages: Messages) {
  const key = toSupported(locale);
  registry[key] = deepMerge(registry[key] ?? {}, messages);
}

export function setLocale(locale: string) {
  currentLocale = toSupported(locale);
  applyDocumentAttributes(currentLocale);
}

export function getLocale(): Locale {
  return currentLocale;
}

export function persistLocale(locale: string): Locale {
  const next = toSupported(locale);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore storage failures (e.g. private mode)
    }
  }
  setLocale(next);
  return next;
}

export function _detectLocale(fallback: string = defaultLocale): Locale {
  if (typeof window === 'undefined') {
    return toSupported(fallback);
  }

  const stored = window.localStorage?.getItem(STORAGE_KEY);
  if (stored) return toSupported(stored);

  const htmlLang = document.documentElement?.getAttribute('lang');
  if (htmlLang) return toSupported(htmlLang);

  const [firstChoice] = window.navigator.languages ?? [window.navigator.language];
  if (firstChoice) return toSupported(firstChoice);

  return toSupported(fallback);
}

export function isRtlLocale(locale: string): boolean {
  return rtlLocales.has(toSupported(locale));
}

export function t(
  key: string,
  fallback?: string,
  values?: Record<string, string | number>,
): string {
  const raw = get(registry[currentLocale] ?? {}, key);
  const template = typeof raw === 'string' ? raw : fallback ?? key;
  if (!values) return template;
  return Object.entries(values).reduce(
    (acc, [token, value]) => acc.replaceAll(`{${token}}`, String(value)),
    template,
  );
}

type Ctx = { locale: Locale; setLocale: (next: Locale) => void; t: typeof t };
const LocaleCtx = createContext<Ctx | null>(null);

export function useLocale(): Ctx {
  return (
    useContext(LocaleCtx) ?? {
      locale: currentLocale,
      setLocale,
      t,
    }
  );
}

export function LocaleProvider({
  initialLocale = defaultLocale,
  children,
}: {
  initialLocale?: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(toSupported(initialLocale));

  useEffect(() => {
    const detected = _detectLocale(locale);
    setLocaleState(detected);
  }, []);

  useEffect(() => {
    persistLocale(locale);
  }, [locale]);

  const changeLocale = useCallback((next: Locale) => {
    setLocaleState(toSupported(next));
  }, []);

  const value = useMemo<Ctx>(() => ({ locale, setLocale: changeLocale, t }), [locale, changeLocale]);

  return <LocaleCtx.Provider value={value}>{children}</LocaleCtx.Provider>;
}
