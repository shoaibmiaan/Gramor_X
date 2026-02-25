import { useMemo, useState } from 'react';
import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { getServerClient } from '@/lib/supabaseServer';
import { Button } from '@/components/design-system/Button';
import { type OnboardingPayload, type StudyPlan, onboardingPayloadSchema } from '@/lib/onboarding/aiStudyPlan';

type OnboardingRecord = {
  target_band: number;
  exam_date: string;
  reading_level: number;
  writing_level: number;
  listening_level: number;
  speaking_level: number;
  learning_style: OnboardingPayload['learningStyle'];
  generated_plan: StudyPlan | null;
};

interface DashboardProps {
  userEmail: string;
  onboarding: OnboardingRecord;
}

export default function Dashboard({ userEmail, onboarding }: DashboardProps) {
  const router = useRouter();
  const [isReplanning, setIsReplanning] = useState(false);
  const studyPlan = onboarding.generated_plan;

  const firstTask = useMemo(() => studyPlan?.weekly_plan?.[0]?.tasks?.[0] ?? 'Complete your first diagnostic task.', [studyPlan]);

  const skillMeters = [
    { label: 'Reading', value: onboarding.reading_level },
    { label: 'Writing', value: onboarding.writing_level },
    { label: 'Listening', value: onboarding.listening_level },
    { label: 'Speaking', value: onboarding.speaking_level },
  ];

  const handleReadjust = async () => {
    setIsReplanning(true);
    try {
      const payload: OnboardingPayload = {
        targetBand: onboarding.target_band,
        examDate: onboarding.exam_date,
        readingLevel: onboarding.reading_level,
        writingLevel: onboarding.writing_level,
        listeningLevel: onboarding.listening_level,
        speakingLevel: onboarding.speaking_level,
        learningStyle: onboarding.learning_style,
      };

      const validation = onboardingPayloadSchema.safeParse(payload);
      if (!validation.success) {
        throw new Error('Invalid saved onboarding data.');
      }

      const response = await fetch('/api/ai/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Unable to re-adjust plan right now.');
      }

      await router.replace('/dashboard');
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Failed to re-adjust plan.');
    } finally {
      setIsReplanning(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <header className="rounded-xl border bg-white p-6">
          <p className="text-sm text-gray-500">{userEmail}</p>
          <h1 className="text-3xl font-bold">Your AI Study Plan is Ready</h1>
          <p className="mt-2 text-gray-600">Priority skill: {studyPlan?.priority_skill ?? 'N/A'}</p>
        </header>

        <section className="rounded-xl border bg-white p-6">
          <h2 className="mb-3 text-xl font-semibold">Timeline Strip</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {studyPlan?.weekly_plan?.map((item) => (
              <article key={item.week} className="min-w-56 rounded-lg border bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Week {item.week}</p>
                <p className="font-semibold">{item.focus}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <article className="rounded-xl border bg-white p-6">
            <h3 className="text-lg font-semibold">Today&apos;s Task</h3>
            <p className="mt-3 text-gray-700">{firstTask}</p>
            <Button className="mt-5" onClick={() => router.push('/practice')}>
              Start First Lesson
            </Button>
          </article>

          <article className="rounded-xl border bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold">Skill Progress Meters</h3>
            <div className="space-y-3">
              {skillMeters.map((skill) => (
                <div key={skill.label}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{skill.label}</span>
                    <span>{skill.value}/5</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-200">
                    <div className="h-2 rounded-full bg-blue-600" style={{ width: `${(skill.value / 5) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <div>
          <Button variant="outline" onClick={handleReadjust} disabled={isReplanning}>
            {isReplanning ? 'Re-adjusting…' : 'AI Re-adjust Plan'}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

export const getServerSideProps: GetServerSideProps<DashboardProps> = async (context) => {
  const supabase = getServerClient(context);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { redirect: { destination: '/login?next=/dashboard', permanent: false } };
  }

  const { data: onboarding } = await supabase
    .from('user_onboarding')
    .select(
      'target_band,exam_date,reading_level,writing_level,listening_level,speaking_level,learning_style,generated_plan',
    )
    .eq('user_id', user.id)
    .maybeSingle();

  if (!onboarding) {
    return { redirect: { destination: '/onboarding', permanent: false } };
  }

  return {
    props: {
      userEmail: user.email ?? 'Learner',
      onboarding: onboarding as OnboardingRecord,
    },
  };
};
