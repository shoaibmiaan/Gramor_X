import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { getServerClient } from '@/lib/supabaseServer';
import { onboardingPayloadSchema, type OnboardingPayload } from '@/lib/onboarding/aiStudyPlan';

type Step = 1 | 2 | 3 | 4;

const BANDS = [5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0];
const LEARNING_STYLES: OnboardingPayload['learningStyle'][] = [
  'Video',
  'Practice Tests',
  'Flashcards',
  'Mixed',
];

const initialState: OnboardingPayload = {
  targetBand: 6.5,
  examDate: '',
  readingLevel: 3,
  writingLevel: 3,
  listeningLevel: 3,
  speakingLevel: 3,
  learningStyle: 'Mixed',
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<OnboardingPayload>(initialState);
  const [error, setError] = useState<string | null>(null);

  const canNext = useMemo(() => {
    if (step === 2) return Boolean(form.examDate);
    return true;
  }, [form.examDate, step]);

  const update = <K extends keyof OnboardingPayload>(key: K, value: OnboardingPayload[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const next = () => {
    if (!canNext) {
      setError('Please complete this step to continue.');
      return;
    }

    setError(null);
    if (step === 4) {
      const validated = onboardingPayloadSchema.safeParse(form);
      if (!validated.success) {
        setError('Please review your responses before continuing.');
        return;
      }

      sessionStorage.setItem('gramorx:onboarding-input', JSON.stringify(validated.data));
      void router.push('/onboarding/thinking');
      return;
    }

    setStep((prev) => (prev + 1) as Step);
  };

  const back = () => {
    if (step === 1) return;
    setStep((prev) => (prev - 1) as Step);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">GramorX AI Onboarding</h1>
        <p className="text-sm text-gray-500">Step {step} / 4</p>
      </div>

      <div className="mb-8 h-2 rounded-full bg-gray-200">
        <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${(step / 4) * 100}%` }} />
      </div>

      <AnimatePresence mode="wait">
        <motion.section
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="rounded-xl border bg-white p-6 shadow-sm"
        >
          {step === 1 && (
            <section>
              <h2 className="text-xl font-semibold">Choose your target IELTS band</h2>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {BANDS.map((band) => (
                  <button
                    key={band}
                    type="button"
                    onClick={() => update('targetBand', band)}
                    className={`rounded-lg border px-4 py-3 font-semibold transition ${
                      form.targetBand === band ? 'border-blue-600 bg-blue-50 text-blue-700' : 'hover:border-gray-400'
                    }`}
                  >
                    {band.toFixed(1)}
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 2 && (
            <section>
              <h2 className="text-xl font-semibold">When is your IELTS exam?</h2>
              <input
                type="date"
                className="mt-4 w-full rounded-lg border px-4 py-3"
                value={form.examDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => update('examDate', e.target.value)}
              />
            </section>
          )}

          {step === 3 && (
            <section>
              <h2 className="text-xl font-semibold">Rate your current skills (1-5)</h2>
              <div className="mt-5 space-y-4">
                {([
                  ['readingLevel', 'Reading'],
                  ['writingLevel', 'Writing'],
                  ['listeningLevel', 'Listening'],
                  ['speakingLevel', 'Speaking'],
                ] as const).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <span className="w-24 font-medium">{label}</span>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => update(key, value)}
                          className={`h-9 w-9 rounded-full border text-sm ${
                            form[key] === value ? 'border-blue-600 bg-blue-600 text-white' : 'hover:border-gray-400'
                          }`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {step === 4 && (
            <section>
              <h2 className="text-xl font-semibold">Select your preferred learning style</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {LEARNING_STYLES.map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => update('learningStyle', style)}
                    className={`rounded-lg border p-4 text-left font-medium ${
                      form.learningStyle === style ? 'border-blue-600 bg-blue-50 text-blue-700' : 'hover:border-gray-400'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </section>
          )}
        </motion.section>
      </AnimatePresence>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex justify-between">
        <button type="button" onClick={back} className="rounded-md border px-4 py-2" disabled={step === 1}>
          Back
        </button>
        <button type="button" onClick={next} className="rounded-md bg-blue-600 px-4 py-2 text-white">
          {step === 4 ? 'Generate Plan' : 'Continue'}
        </button>
      </div>
    </main>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const supabase = getServerClient(context);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { redirect: { destination: '/login?next=/onboarding', permanent: false } };
  }

  const { data: existing } = await supabase
    .from('user_onboarding')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    return { redirect: { destination: '/dashboard', permanent: false } };
  }

  return { props: {} };
};
