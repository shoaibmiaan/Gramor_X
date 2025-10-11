import type { Messages } from '@/lib/locale';
import type { SupportedLocale } from './config';

import enCommon from '@/locales/en/common.json';
import enHome from '@/locales/en/home.json';
import enOnboarding from '@/locales/en/onboarding.json';
import enProfile from '@/locales/en/profile.json';
import enStudyPlan from '@/locales/en/study-plan.json';
import enSaved from '@/locales/en/saved.json';

import urCommon from '@/locales/ur/common.json';
import urHome from '@/locales/ur/home.json';
import urOnboarding from '@/locales/ur/onboarding.json';
import urProfile from '@/locales/ur/profile.json';
import urStudyPlan from '@/locales/ur/study-plan.json';
import urSaved from '@/locales/ur/saved.json';

function deepMerge(target: Messages, source: Messages): Messages {
  const result: Messages = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = deepMerge((result[key] as Messages) ?? {}, value as Messages);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function mergeAll(...entries: Messages[]): Messages {
  return entries.reduce<Messages>((acc, entry) => deepMerge(acc, entry), {});
}

export const dictionaries: Record<SupportedLocale, Messages> = {
  en: mergeAll(enCommon, enHome, enOnboarding, enProfile, enStudyPlan, enSaved),
  ur: mergeAll(urCommon, urHome, urOnboarding, urProfile, urStudyPlan, urSaved),
};

export default dictionaries;
