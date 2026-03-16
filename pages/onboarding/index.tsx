// pages/onboarding/index.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';
import { StepLayout } from '@/components/onboarding/StepLayout';
import { SavingIndicator } from '@/components/ui/SavingIndicator';
import { ValidationError } from '@/components/ui/ValidationError';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useStepValidation } from '@/hooks/useStepValidation';
import { resolveNavigation } from '@/lib/onboarding/client';
import { loadDraft, saveDraft } from '@/lib/onboarding/draft';
import { cn } from '@/lib/utils';

type LanguageCode = 'en' | 'ur';

export default function OnboardingLanguagePage() {
  const router = useRouter();
  const nav = resolveNavigation('language');
  const [language, setLanguage] = useState<LanguageCode | null>(null);

  useEffect(() => {
    const draft = loadDraft('language', { preferredLanguage: 'en' as LanguageCode });
    setLanguage(draft.preferredLanguage);
  }, []);

  useEffect(() => {
    if (language) saveDraft('language', { preferredLanguage: language });
  }, [language]);

  const payload = { preferredLanguage: language ?? 'en' };
  const { isValid, errors } = useStepValidation(2, payload);

  const {
    isSaving,
    isSaved,
    error: autoSaveError,
    flush,
  } = useAutoSave({
    step: 2,
    data: payload,
    enabled: Boolean(language) && isValid,
  });

  const handleContinue = async () => {
    if (!language || !isValid) return;
    const didSave = await flush();
    if (!didSave) return;
    if (nav.next) await router.push(nav.next.path);
  };

  return (
    <StepLayout
      title="Pick your learning language"
      subtitle="We'll translate nudges, reminders, and key instructions so the platform feels natural to you. You can change this later from Settings → Preferences."
      step={nav.index + 1}
      total={nav.total}
      onBack={nav.prev ? () => router.push(nav.prev.path) : undefined}
      statusIndicator={
        <SavingIndicator isSaving={isSaving} isSaved={isSaved} error={autoSaveError} />
      }
      footer={
        <Button onClick={handleContinue} disabled={!language || !isValid}>
          Continue
          <Icon name="arrow-right" className="ml-2 h-4 w-4" />
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <LanguageChoice
          label="English"
          description="Interface, reminders, and lessons in English."
          selected={language === 'en'}
          onSelect={() => setLanguage('en')}
        />
        <LanguageChoice
          label="اردو + English mix"
          description="Interface in Urdu with IELTS practice mostly kept bilingual."
          selected={language === 'ur'}
          onSelect={() => setLanguage('ur')}
        />
      </div>
      <ValidationError message={errors.preferredLanguage || errors._form} />

      <p className="mt-4 text-xs text-muted-foreground">
        Tip: Use <span className="rounded bg-muted px-1.5 py-0.5">←</span> and{' '}
        <span className="rounded bg-muted px-1.5 py-0.5">→</span> arrow keys to move between
        options, then press <span className="rounded bg-muted px-1.5 py-0.5">Enter</span> to
        continue.
      </p>
    </StepLayout>
  );
}

interface LanguageChoiceProps {
  label: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}

const LanguageChoice: React.FC<LanguageChoiceProps> = ({
  label,
  description,
  selected,
  onSelect,
}) => {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group flex h-full flex-col rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:p-5',
        selected
          ? 'border-primary bg-primary/10 shadow-md'
          : 'border-border bg-muted/40 hover:border-primary/60 hover:bg-muted',
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {label.charAt(0)}
          </span>
          <span className="text-base font-semibold sm:text-lg">{label}</span>
        </div>

        <div
          className={cn(
            'flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold transition-colors',
            selected
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background text-muted-foreground group-hover:border-primary/70',
          )}
        >
          {selected ? <Icon name="check" className="h-3 w-3" /> : ''}
        </div>
      </div>

      <p className="text-xs text-muted-foreground sm:text-sm">{description}</p>
    </button>
  );
};
