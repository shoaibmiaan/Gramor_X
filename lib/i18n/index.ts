// lib/i18n/index.ts
import { i18nConfig, SupportedLocale } from "./config";
import { setLocale as setGlobalLocale } from "@/lib/locale";

let currentLocale: SupportedLocale = i18nConfig.defaultLocale;
let translations: Record<string, string> = {};

function deepMerge<T extends Record<string, any>>(base: T, override: T): T {
  const result: Record<string, any> = { ...base };
  for (const key of Object.keys(override)) {
    const value = override[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = deepMerge(result[key] ?? {}, value);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

/**
 * Load translations for a given locale.
 */
export async function loadTranslations(locale: SupportedLocale) {
  if (!i18nConfig.locales.includes(locale)) {
    locale = i18nConfig.defaultLocale;
  }

  try {
    const base = await import(`@/locales/${i18nConfig.defaultLocale}/common.json`);
    const mod = await import(`@/locales/${locale}/common.json`);
    translations = deepMerge(base.default, mod.default);
    currentLocale = locale;
    setGlobalLocale(locale);
  } catch (e) {
    console.error("Failed to load translations", e);
    translations = {};
    currentLocale = i18nConfig.defaultLocale;
    setGlobalLocale(i18nConfig.defaultLocale);
  }
}

/**
 * Translate a key using loaded translations.
 */
export function t(key: string): string {
  return translations[key] ?? key;
}

/**
 * Get current locale.
 */
export function getLocale(): SupportedLocale {
  return currentLocale;
}
