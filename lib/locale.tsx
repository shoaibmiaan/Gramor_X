import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

import enMessages from "@/public/locales/en/common.json";
import hiMessages from "@/public/locales/hi/common.json";
import urMessages from "@/public/locales/ur/common.json";
import arMessages from "@/public/locales/ar/common.json";
import esMessages from "@/public/locales/es/common.json";

/** ---- minimal message registry ---- */
type Messages = Record<string, any>;
const registry: Record<string, Messages> = {};   // e.g. { en: { home: { title: "…" } } }
let currentLocale = "en";

/** Deep lookup: "a.b.c" -> obj.a?.b?.c */
function get(obj: any, path: string) {
  return path.split(".").reduce((acc, p) => (acc != null ? acc[p] : undefined), obj);
}

/** Public: register/merge messages at runtime (optional) */
export function registerMessages(locale: string, messages: Messages) {
  registry[locale] = { ...(registry[locale] || {}), ...messages };
}

/** ---- core API (module-safe) ---- */
export function setLocale(locale: string) {
  currentLocale = locale || "en";
}
export function getLocale() {
  return currentLocale;
}

/** Always-callable translator. Falls back to key or provided fallback. */
export function t(key: string, fallback?: string): string {
  const msg = get(registry[currentLocale] || {}, key);
  if (typeof msg === "string") return msg;
  return fallback ?? key;
}

/** ---- React context (optional) ---- */
type Ctx = { locale: string; setLocale: (l: string) => void; t: typeof t };
const LocaleCtx = createContext<Ctx | null>(null);

export function useLocale(): Ctx {
  // If not inside provider, fall back to module-level state so callers still work.
  return (
    useContext(LocaleCtx) ?? { locale: currentLocale, setLocale, t }
  );
}

export function LocaleProvider({
  initialLocale = "en",
  children,
}: {
  initialLocale?: string;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState(initialLocale);
  const loadedLocales = useRef(new Set<string>());

  // keep module-level locale in sync with provider state
  useEffect(() => {
    currentLocale = locale;
  }, [locale]);

  useEffect(() => {
    const loaders: Record<string, () => Messages | Promise<Messages>> = {
      en: () => enMessages,
      hi: () => hiMessages,
      ur: () => urMessages,
      ar: () => arMessages,
      es: () => esMessages,
    };

    if (loadedLocales.current.has(locale)) return;

    const load = loaders[locale] ?? loaders.en;
    const result = load();

    Promise.resolve(result)
      .then((messages) => {
        registerMessages(locale, messages || {});
        loadedLocales.current.add(locale);
      })
      .catch((error) => {
        if (process.env.NODE_ENV !== "production") {
          console.error("Failed to load locale messages", error);
        }
      });
  }, [locale]);

  const value = useMemo<Ctx>(() => ({ locale, setLocale: setLocaleState, t }), [locale]);
  return <LocaleCtx.Provider value={value}>{children}</LocaleCtx.Provider>;
}

const builtinMessages: Record<string, Messages> = {
  en: enMessages,
  hi: hiMessages,
  ur: urMessages,
  ar: arMessages,
  es: esMessages,
};

Object.entries(builtinMessages).forEach(([locale, messages]) => {
  registerMessages(locale, messages);
});
