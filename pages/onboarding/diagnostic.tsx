// pages/onboarding/diagnostic.tsx
import { useState } from 'react';
import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { getServerClient } from '@/lib/supabaseServer';

import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Progress } from '@/components/design-system/Progress';
import RadioGroup from '@/components/design-system/RadioGroup';
import { Radio } from '@/components/design-system/Radio';

// Fallback layout if OnboardingLayout is missing
const FallbackLayout = ({ children, title, description }: any) => (
  <div className="min-h-screen bg-gray-50 py-10">
    <div className="max-w-4xl mx-auto px-4">
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      <p className="text-gray-600 mb-8">{description}</p>
      {children}
    </div>
  </div>
);

interface Props {
  user: any;
  profile: any;
}

const DiagnosticPage = ({ user, profile }: Props) => {
  const router = useRouter();
  const [currentSection, setCurrentSection] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sections = [
    // Reading
    {
      title: 'Reading Diagnostic',
      description: "Let's assess your current reading level",
      questions: [
        { id: 'reading_confidence', text: 'How confident are you with academic reading?', options: [
          { value: 1, label: 'Not confident at all' }, { value: 2, label: 'Slightly confident' },
          { value: 3, label: 'Moderately confident' }, { value: 4, label: 'Very confident' },
          { value: 5, label: 'Extremely confident' }
        ]},
        // ... add other reading questions
      ]
    },
    // Listening, Writing, Speaking – add them here
  ];

  const current = sections[currentSection] || { questions: [] };
  const progress = ((currentSection + 1) / sections.length) * 100;

  const handleAnswer = (id: string, value: number) => {
    setAnswers(prev => ({ ...prev, [id]: value }));
  };

  const isComplete = () => current.questions.every(q => answers[q.id] !== undefined);

  const handleNext = async () => {
    if (!isComplete()) {
      setError('Please answer all questions.');
      return;
    }
    setError(null);

    if (currentSection < sections.length - 1) {
      setCurrentSection(prev => prev + 1);
    } else {
      setIsSubmitting(true);
      try {
        const estimated = {
          reading: calculateEstimatedScore(answers, 'reading'),
          listening: calculateEstimatedScore(answers, 'listening'),
          writing: calculateEstimatedScore(answers, 'writing'),
          speaking: calculateEstimatedScore(answers, 'speaking'),
        };

        const res = await fetch('/api/onboarding/diagnostic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers, estimatedScores: estimated })
        });

        if (!res.ok) throw new Error('Save failed');

        router.push('/onboarding/baseline');
      } catch (err: any) {
        setError(err.message || 'Failed to save results.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    if (currentSection > 0) {
      setCurrentSection(prev => prev - 1);
    } else {
      router.push('/onboarding/baseline');
    }
  };

  const Layout = OnboardingLayout || FallbackLayout;

  return (
    <Layout
      currentStep={3}
      totalSteps={5}
      title={current.title}
      description={current.description}
      showBack={true}
      onBack={handleBack}
    >
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between text-sm mb-2">
            <span>Section {currentSection + 1} of {sections.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-700">
            {error}
          </div>
        )}

        <Card className="p-6">
          <div className="space-y-10">
            {current.questions.map((q: any, i: number) => (
              <div key={q.id} className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-medium">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium mb-3">{q.text}</p>
                    <RadioGroup
                      value={answers[q.id]?.toString() ?? ''}
                      onValueChange={v => handleAnswer(q.id, Number(v))}
                    >
                      <div className="space-y-3">
                        {q.options.map((o: any) => (
                          <div key={o.value} className="flex items-center">
                            <Radio value={o.value.toString()} id={`${q.id}-${o.value}`} />
                            <label htmlFor={`${q.id}-${o.value}`} className="ml-3 text-sm cursor-pointer">
                              {o.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex justify-between mt-8">
          <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!isComplete() || isSubmitting}
            isLoading={isSubmitting}
          >
            {currentSection === sections.length - 1 ? 'Finish' : 'Next'}
          </Button>
        </div>
      </div>
    </Layout>
  );
};

function calculateEstimatedScore(answers: Record<string, number>, skill: string): number {
  const vals = Object.entries(answers)
    .filter(([k]) => k.startsWith(skill))
    .map(([, v]) => v);

  if (!vals.length) return 6.0;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.round((3 + avg) * 2) / 2;
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const supabase = getServerClient(ctx);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { redirect: { destination: '/login', permanent: false } };

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (profile?.onboarding_step && profile.onboarding_step > 3) {
    return { redirect: { destination: '/onboarding/baseline', permanent: false } };
  }

  return { props: { user, profile: profile || {} } };
};

export default DiagnosticPage;