import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Messages = Record<string, any>;
const registry: Record<string, Messages> = {};

export type Locale = "en" | "ur";

const COOKIE = "locale";
const STORAGE_KEY = "preferredLocale";
const RTL_LOCALES: ReadonlySet<Locale> = new Set(["ur"]);

let currentLocale: Locale = "en";

function get(obj: any, path: string) {
  return path.split(".").reduce((acc, p) => (acc != null ? acc[p] : undefined), obj);
}

function normalize(locale: string | null | undefined, fallback: Locale = "en"): Locale {
  if (!locale) return fallback;
  return locale.toLowerCase().startsWith("ur") ? "ur" : "en";
}

function applyToDocument(locale: Locale) {
  if (typeof document === "undefined") return;
  const dir = RTL_LOCALES.has(locale) ? "rtl" : "ltr";
  document.documentElement.lang = locale;
  document.documentElement.dir = dir;
}

export function registerMessages(locale: string, messages: Messages) {
  registry[locale] = { ...(registry[locale] || {}), ...messages };
}

export function setLocale(locale: string) {
  currentLocale = normalize(locale);
  applyToDocument(currentLocale);
}

export function getLocale(fallback: Locale = "en"): Locale {
  return currentLocale ?? fallback;
}

export function persistLocale(locale: Locale) {
  const next = normalize(locale);
  setLocale(next);
  if (typeof document !== "undefined") {
    const maxAge = 60 * 60 * 24 * 365; // 1 year
    document.cookie = `${COOKIE}=${encodeURIComponent(next)};path=/;max-age=${maxAge}`;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore storage errors
    }
  }
  return next;
}

export function readStoredLocale(): Locale {
  if (typeof document === "undefined") return currentLocale;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) return normalize(stored as Locale);
  } catch {
    // ignore
  }
  const match = document.cookie.match(new RegExp(`(?:^|;)\\s*${COOKIE}=([^;]+)`));
  if (match?.[1]) return normalize(decodeURIComponent(match[1]));
  return currentLocale;
}

export function _detectLocale(): Locale {
  if (typeof navigator === "undefined") return currentLocale;
  const lang = navigator.language || navigator.languages?.[0];
  return normalize(lang, currentLocale);
}

export function t(key: string, fallback?: string): string {
  const msg = get(registry[currentLocale] || {}, key);
  if (typeof msg === "string") return msg;
  return fallback ?? key;
}

type Ctx = { locale: Locale; setLocale: (l: Locale) => void; t: typeof t };
const LocaleCtx = createContext<Ctx | null>(null);

export function useLocale(): Ctx {
  return useContext(LocaleCtx) ?? { locale: currentLocale, setLocale: (l) => setLocale(l), t };
}

export function LocaleProvider({
  initialLocale = "en",
  children,
}: {
  initialLocale?: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(normalize(initialLocale));

  useEffect(() => {
    currentLocale = locale;
    applyToDocument(locale);
  }, [locale]);

  const value = useMemo<Ctx>(
    () => ({ locale, setLocale: (l: Locale) => setLocaleState(normalize(l)), t }),
    [locale],
  );
  return <LocaleCtx.Provider value={value}>{children}</LocaleCtx.Provider>;
}
