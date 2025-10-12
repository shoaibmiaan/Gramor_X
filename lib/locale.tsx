import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import enMessages from '@/public/locales/en/common.json';
import hiMessages from '@/public/locales/hi/common.json';
import urMessages from '@/public/locales/ur/common.json';
import arMessages from '@/public/locales/ar/common.json';
import esMessages from '@/public/locales/es/common.json';

const SUPPORTED_LOCALES = ['en', 'ur'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
const DEFAULT_LOCALE: Locale = 'en';
const STORAGE_KEY = 'gx:locale';
const COOKIE_KEY = 'locale';
const RTL_LOCALES = new Set(['ur', 'ar', 'fa', 'he', 'ps']);

type Messages = Record<string, unknown>;
const registry: Partial<Record<Locale, Messages>> = {};
let currentLocale: Locale = DEFAULT_LOCALE;

const subscribers = new Set<(locale: Locale) => void>();

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function deepMerge(target: Messages = {}, source: Messages = {}): Messages {
  const result: Messages = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (isObject(value)) {
      const existing = isObject(result[key]) ? (result[key] as Messages) : {};
      result[key] = deepMerge(existing, value as Messages);
    } else {
      result[key] = value;
    }
  }
  return result;
}
function deepGet(obj: unknown, path: string): unknown {
  if (!obj) return undefined;
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc == null) return undefined;
    if (isObject(acc) || Array.isArray(acc)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

function normaliseLocale(raw?: string | null): Locale {
  if (!raw) return DEFAULT_LOCALE;
  const lower = raw.toLowerCase();
  const direct = SUPPORTED_LOCALES.find((loc) => loc === lower);
  if (direct) return direct;
  const base = lower.split('-')[0];
  const baseMatch = SUPPORTED_LOCALES.find((loc) => loc === base);
  return baseMatch ?? DEFAULT_LOCALE;
}

export function toSupportedLocale(input: string | Locale): Locale {
  return normaliseLocale(typeof input === 'string' ? input : String(input));
}

export function isLocaleRTL(locale: string | null | undefined): boolean {
  if (!locale) return false;
  const base = locale.split('-')[0]?.toLowerCase() ?? '';
  return RTL_LOCALES.has(base);
}

function applyLocale(locale: Locale) {
  if (typeof document === 'undefined') return;
  try {
    const dir = isLocaleRTL(locale) ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('lang', locale);
    document.documentElement.setAttribute('dir', dir);
  } catch (err) {
    console.warn('Failed to apply locale attributes', err);
  }
}
function persistLocaleCookie(locale: Locale, maxAgeSeconds = 60 * 60 * 24 * 180) {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE_KEY}=${encodeURIComponent(locale)}; path=/; max-age=${maxAgeSeconds}`;
}
function persistLocaleStorage(locale: Locale) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // ignore
  }
}
function notify(locale: Locale) {
  subscribers.forEach((listener) => {
    try {
      listener(locale);
    } catch (err) {
      console.error('Locale subscriber failed', err);
    }
  });
}
function readCookie(name: string, cookieString?: string): string | undefined {
  const source = cookieString ?? (typeof document !== 'undefined' ? document.cookie : undefined);
  if (!source) return undefined;
  const match = source.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}
function parseAcceptLanguage(header?: string): string | null {
  if (!header) return null;
  const tokens = header.split(',');
  for (const token of tokens) {
    const locale = token.split(';')[0]?.trim();
    if (locale) return locale;
  }
  return null;
}

export function registerMessages(localeInput: string, messages: Messages) {
  const locale = normaliseLocale(localeInput);
  registry[locale] = deepMerge(registry[locale] ?? {}, messages);
}
function resolveMessage(locale: Locale, key: string): string | undefined {
  const source = registry[locale];
  if (!source) return undefined;
  const value = deepGet(source, key);
  return typeof value === 'string' ? value : undefined;
}

type TemplateValues = Record<string, string | number>;
function formatTemplate(template: string, values: TemplateValues): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, token: string) => {
    const replacement = values[token];
    return replacement === undefined || replacement === null ? '' : String(replacement);
  });
}

export function t(key: string, arg2?: TemplateValues | string, arg3?: string): string {
  let values: TemplateValues | undefined;
  let fallback: string | undefined;

  if (arg2 && typeof arg2 === 'object' && !Array.isArray(arg2)) {
    values = arg2 as TemplateValues;
    fallback = arg3;
  } else if (typeof arg2 === 'string') {
    fallback = arg2;
  }

  const primary = resolveMessage(currentLocale, key);
  const fallbackLocale = currentLocale === DEFAULT_LOCALE ? undefined : resolveMessage(DEFAULT_LOCALE, key);
  const template = primary ?? fallbackLocale ?? fallback ?? key;
  return values ? formatTemplate(template, values) : template;
}

export function detectLocale(
  defaultLocale: Locale = DEFAULT_LOCALE,
  opts?: { cookieString?: string; acceptLanguageHeader?: string },
): Locale {
  const fromCookie = readCookie(COOKIE_KEY, opts?.cookieString);
  if (fromCookie) return normaliseLocale(fromCookie);

  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) return normaliseLocale(stored);
    } catch { /* ignore */ }

    const htmlLocale = document?.documentElement?.getAttribute('lang');
    if (htmlLocale) return normaliseLocale(htmlLocale);

    const nav = (navigator?.languages && navigator.languages[0]) || navigator?.language;
    if (nav) return normaliseLocale(nav);
  }

  const fromHeader = parseAcceptLanguage(opts?.acceptLanguageHeader);
  if (fromHeader) return normaliseLocale(fromHeader);

  return defaultLocale;
}

export const _detectLocale = detectLocale;

export function setLocale(nextInput: string | Locale) {
  const next = normaliseLocale(nextInput as string);
  if (currentLocale === next) return;
  currentLocale = next;
  applyLocale(next);
  persistLocaleCookie(next);
  persistLocaleStorage(next);
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('locale:changed', { detail: next }));
    } catch { /* ignore */ }
  }
  notify(next);
}
export const persistLocale = setLocale;
export function getLocale(): Locale {
  return currentLocale;
}

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale | string) => void;
  t: typeof t;
  direction: 'ltr' | 'rtl';
  isRTL: boolean;
};

const LocaleCtx = createContext<LocaleContextValue | null>(null);

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleCtx);
  if (ctx) return ctx;
  const direction = isLocaleRTL(currentLocale) ? 'rtl' : 'ltr';
  return { locale: currentLocale, setLocale, t, direction, isRTL: direction === 'rtl' };
}

export function LocaleProvider({
  initialLocale = DEFAULT_LOCALE,
  children,
}: {
  initialLocale?: Locale | string;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const detected =
      typeof window === 'undefined'
        ? normaliseLocale(initialLocale as string)
        : detectLocale(normaliseLocale(initialLocale as string));
    currentLocale = detected;
    return detected;
  });

  useEffect(() => {
    applyLocale(locale);
    persistLocaleCookie(locale);
    persistLocaleStorage(locale);
  }, [locale]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        setLocale(event.newValue);
      }
    };
    const handleCustom = (event: Event) => {
      const detail = (event as CustomEvent<Locale>).detail;
      if (detail) setLocale(detail);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage);
      window.addEventListener('locale:changed', handleCustom as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener('locale:changed', handleCustom as EventListener);
      }
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribe((next) => setLocaleState(next));
    return unsubscribe;
  }, []);

  const update = useCallback((next: Locale | string) => setLocale(next), []);

  const value = useMemo<LocaleContextValue>(() => {
    const direction = isLocaleRTL(locale) ? 'rtl' : 'ltr';
    return { locale, setLocale: update, t, direction, isRTL: direction === 'rtl' };
  }, [locale, update]);

  return <LocaleCtx.Provider value={value}>{children}</LocaleCtx.Provider>;
}

function subscribe(listener: (locale: Locale) => void) {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

// register built-in message bundles (including Urdu)
const builtinMessages: Record<string, Messages> = {
  en: enMessages,
  hi: hiMessages,
  ur: urMessages,
  ar: arMessages,
  es: esMessages,
};
Object.entries(builtinMessages).forEach(([loc, messages]) => {
  registerMessages(loc, messages);
});
