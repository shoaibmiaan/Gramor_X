// lib/i18n/index.ts
import { i18nConfig, SupportedLocale } from './config';
import { registerMessages, setLocale as setActiveLocale, t as translate, getLocale as getActiveLocale } from '@/lib/locale';

const loadedLocales = new Set<SupportedLocale>();

function toSupported(locale: string): SupportedLocale {
  return i18nConfig.locales.includes(locale as SupportedLocale)
    ? (locale as SupportedLocale)
    : i18nConfig.defaultLocale;
}

export async function loadTranslations(locale: SupportedLocale) {
  const target = toSupported(locale);
  if (loadedLocales.has(target)) return;
  try {
    const mod = await import(`@/locales/${target}/common.json`);
    registerMessages(target, mod.default as Record<string, unknown>);
    loadedLocales.add(target);
  } catch (error) {
    console.error('Failed to load translations', error);
    if (target !== i18nConfig.defaultLocale && !loadedLocales.has(i18nConfig.defaultLocale)) {
      try {
        const fallback = await import(`@/locales/${i18nConfig.defaultLocale}/common.json`);
        registerMessages(i18nConfig.defaultLocale, fallback.default as Record<string, unknown>);
        loadedLocales.add(i18nConfig.defaultLocale);
        setActiveLocale(i18nConfig.defaultLocale);
      } catch (err) {
        console.error('Failed to load fallback translations', err);
      }
    }
  }
}

export function getLocale(): SupportedLocale {
  const active = getActiveLocale();
  return toSupported(active);
}

export const t = translate;
