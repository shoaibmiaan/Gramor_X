import { supabaseBrowser } from '@/lib/supabaseBrowser';
import type { Locale } from '@/lib/locale';

export type OnboardingStep = 'band' | 'date' | 'whatsapp';

const STORAGE_KEYS = {
  goal: 'onboarding.goal',
  examDate: 'onboarding.examDate',
  whatsappOptIn: 'onboarding.whatsappOptIn',
  step: 'onboarding.step',
} as const;

export type OnboardingDraft = {
  goalBand?: number;
  examDate?: string | null;
  whatsappOptIn?: boolean;
  locale?: Locale;
};

export function readDraft(): OnboardingDraft {
  if (typeof window === 'undefined') return {};
  const goalRaw = window.localStorage.getItem(STORAGE_KEYS.goal);
  const examDate = window.localStorage.getItem(STORAGE_KEYS.examDate) || undefined;
  const optInRaw = window.localStorage.getItem(STORAGE_KEYS.whatsappOptIn);

  return {
    goalBand: goalRaw ? Number(goalRaw) : undefined,
    examDate: examDate || undefined,
    whatsappOptIn: optInRaw ? optInRaw === 'true' : undefined,
  };
}

export function persistDraft(partial: OnboardingDraft) {
  if (typeof window === 'undefined') return;
  if (partial.goalBand != null) {
    window.localStorage.setItem(STORAGE_KEYS.goal, String(partial.goalBand));
  }
  if (partial.examDate !== undefined) {
    if (partial.examDate) {
      window.localStorage.setItem(STORAGE_KEYS.examDate, partial.examDate);
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.examDate);
    }
  }
  if (partial.whatsappOptIn != null) {
    window.localStorage.setItem(STORAGE_KEYS.whatsappOptIn, String(partial.whatsappOptIn));
  }
}

export function markStep(step: OnboardingStep) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEYS.step, step);
}

export function getMarkedStep(): OnboardingStep | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEYS.step);
  if (raw === 'band' || raw === 'date' || raw === 'whatsapp') return raw;
  return null;
}

export function clearDraft() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEYS.goal);
  window.localStorage.removeItem(STORAGE_KEYS.examDate);
  window.localStorage.removeItem(STORAGE_KEYS.whatsappOptIn);
  window.localStorage.removeItem(STORAGE_KEYS.step);
}

export async function completeOnboarding(draft: Required<Pick<OnboardingDraft, 'goalBand'>> & OnboardingDraft) {
  const {
    data: { session },
  } = await supabaseBrowser.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error('Not authenticated');

  const updates: Record<string, unknown> = {
    goal_band: draft.goalBand,
    onboarding_complete: true,
    draft: false,
  };

  if (draft.examDate !== undefined) updates.exam_date = draft.examDate || null;
  if (draft.whatsappOptIn !== undefined) {
    updates.notifications_opt_in = {
      whatsapp: draft.whatsappOptIn,
    };
  }
  if (draft.locale) updates.locale = draft.locale;

  const { error } = await supabaseBrowser.from('profiles').update(updates).eq('user_id', userId);
  if (error) throw new Error(error.message);

  await supabaseBrowser.auth.updateUser({ data: { onboarding_complete: true } });
  clearDraft();
}

export async function skipOnboarding() {
  const {
    data: { session },
  } = await supabaseBrowser.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error('Not authenticated');

  await supabaseBrowser.from('profiles').update({ onboarding_complete: true }).eq('user_id', userId);
  await supabaseBrowser.auth.updateUser({ data: { onboarding_complete: true } });
  clearDraft();
}
