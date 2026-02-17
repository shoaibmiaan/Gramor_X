// lib/i18n/index.ts
import { defaultLocale, type SupportedLocale } from './config';
import { dictionaries } from './dictionaries';
import {
  registerMessages,
  setLocale as setActiveLocale,
  toSupportedLocale,
  t as translate,
  getLocale as getActiveLocale,
} from '@/lib/locale';

const loaded = new Set<SupportedLocale>();

registerMessages(defaultLocale, dictionaries[defaultLocale]);
loaded.add(defaultLocale);

export async function loadTranslations(locale: SupportedLocale) {
  const safe = toSupportedLocale(locale);
  if (!loaded.has(safe)) {
    const dictionary = dictionaries[safe] ?? dictionaries[defaultLocale];
    registerMessages(safe, dictionary);
    loaded.add(safe);
  }
  setActiveLocale(safe);
  return safe;
}

export const t = translate;
export const getLocale = getActiveLocale;
