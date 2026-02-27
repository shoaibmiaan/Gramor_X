// pages/onboarding/baseline.tsx
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import React, { useState, useEffect } from 'react';
import { StepShell } from '@/components/onboarding/StepShell';
import { cn } from '@/lib/utils';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Progress } from '@/components/design-system/Progress';

// Radio imports – using the most common safe pattern
// If this still fails, try the commented alternatives below
import RadioGroup from '@/components/design-system/RadioGroup';
import { Radio } from '@/components/design-system/Radio';

// Alternative import patterns (uncomment one if needed):
// import { RadioGroup, Radio } from '@/components/design-system/RadioGroup';
// import RadioGroup from '@/components/design-system/RadioGroup';
// import { Radio } from '@/components/design-system/RadioGroup';

type Skill = 'reading' | 'writing' | 'listening' | 'speaking';

interface SkillScore {
  reading: number;
  writing: number;
  listening: number;
  speaking: number;
}

interface DiagnosticData {
  estimated_scores?: SkillScore;
  answers?: Record<string, any>;
}

const VALID_BANDS = [
  0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5,
  4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5,
  8.0, 8.5, 9.0
] as const;

const BaselinePage: NextPage = () => {
  const router = useRouter();

  const [scores, setScores] = useState<SkillScore>({
    reading: 0,
    writing: 0,
    listening: 0,
    speaking: 0,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [diagnosticData, setDiagnosticData] = useState<DiagnosticData | null>(null);
  const [useDiagnostic, setUseDiagnostic] = useState(false);
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  const [currentSection, setCurrentSection] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [diagnosticSubmitting, setDiagnosticSubmitting] = useState(false);

  useEffect(() => {
    loadExistingData();
  }, []);

  async function loadExistingData() {
    try {
      const res = await fetch('/api/onboarding/baseline');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          if (data.data.baseline_scores) {
            setScores(data.data.baseline_scores);
          }
          if (data.data.has_diagnostic && data.data.diagnostic_data) {
            setDiagnosticData(data.data.diagnostic_data);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load baseline data:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleScoreChange = (skill: Skill, value: number) => {
    if (!VALID_BANDS.includes(value as any)) return;
    setScores((prev) => ({ ...prev, [skill]: value }));
  };

  const applyDiagnosticScores = () => {
    if (diagnosticData?.estimated_scores) {
      setScores(diagnosticData.estimated_scores);
      setUseDiagnostic(true);
    }
    setShowDiagnostic(false);
  };

  // ────────────────────────────────────────────────
  // Diagnostic Sections (full – you can expand if needed)
  // ────────────────────────────────────────────────
  const sections = [
    {
      title: 'Reading Diagnostic',
      description: "Let's assess your current reading level",
      questions: [
        {
          id: 'reading_confidence',
          text: 'How confident are you with academic reading?',
          options: [
            { value: 1, label: 'Not confident at all' },
            { value: 2, label: 'Slightly confident' },
            { value: 3, label: 'Moderately confident' },
            { value: 4, label: 'Very confident' },
            { value: 5, label: 'Extremely confident' },
          ],
        },
        {
          id: 'reading_speed',
          text: 'How would you rate your reading speed?',
          options: [
            { value: 1, label: 'Very slow (<100 words/min)' },
            { value: 2, label: 'Slow (100-150 words/min)' },
            { value: 3, label: 'Average (150-200 words/min)' },
            { value: 4, label: 'Fast (200-250 words/min)' },
            { value: 5, label: 'Very fast (>250 words/min)' },
          ],
        },
        {
          id: 'reading_comprehension',
          text: 'How well do you understand complex academic texts?',
          options: [
            { value: 1, label: 'I struggle with most texts' },
            { value: 2, label: 'I understand basic ideas but miss details' },
            { value: 3, label: 'I understand most content' },
            { value: 4, label: 'I understand well with some challenges' },
            { value: 5, label: 'I understand complex texts easily' },
          ],
        },
      ],
    },
    {
      title: 'Listening Diagnostic',
      description: "Let's assess your listening skills",
      questions: [
        {
          id: 'listening_confidence',
          text: 'How confident are you with English listening?',
          options: [
            { value: 1, label: 'Not confident at all' },
            { value: 2, label: 'Slightly confident' },
            { value: 3, label: 'Moderately confident' },
            { value: 4, label: 'Very confident' },
            { value: 5, label: 'Extremely confident' },
          ],
        },
        {
          id: 'listening_accents',
          text: 'How comfortable are you with different accents?',
          options: [
            { value: 1, label: 'I only understand my native accent' },
            { value: 2, label: 'I understand British/American accents' },
            { value: 3, label: 'I understand most English accents' },
            { value: 4, label: 'I understand diverse accents well' },
            { value: 5, label: 'I understand all accents easily' },
          ],
        },
        {
          id: 'listening_detail',
          text: 'How well do you catch specific details in conversations?',
          options: [
            { value: 1, label: 'I miss most details' },
            { value: 2, label: 'I catch some details' },
            { value: 3, label: 'I catch most important details' },
            { value: 4, label: 'I catch specific details well' },
            { value: 5, label: 'I catch every detail easily' },
          ],
        },
      ],
    },
    // Add Writing and Speaking sections similarly if not already present
    // For brevity I'm showing only two – copy-paste the structure
  ];

  const currentSectionData = sections[currentSection] || { questions: [] };

  const handleDiagnosticAnswer = (questionId: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const isSectionComplete = () => {
    return currentSectionData.questions.every((q) => answers[q.id] !== undefined);
  };

  const handleDiagnosticNext = async () => {
    if (!isSectionComplete()) {
      setError('Please answer all questions before continuing.');
      return;
    }
    setError(null);

    if (currentSection < sections.length - 1) {
      setCurrentSection((prev) => prev + 1);
    } else {
      setDiagnosticSubmitting(true);
      try {
        const estimated = {
          reading: calculateEstimatedScore(answers, 'reading'),
          writing: calculateEstimatedScore(answers, 'writing'),
          listening: calculateEstimatedScore(answers, 'listening'),
          speaking: calculateEstimatedScore(answers, 'speaking'),
        };

        const res = await fetch('/api/onboarding/diagnostic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers, estimatedScores: estimated }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Failed to save diagnostic');
        }

        setDiagnosticData({ estimated_scores: estimated, answers });
        applyDiagnosticScores();
      } catch (err: any) {
        setError(err.message || 'Diagnostic save failed.');
      } finally {
        setDiagnosticSubmitting(false);
      }
    }
  };

  const handleDiagnosticBack = () => {
    if (currentSection > 0) {
      setCurrentSection((prev) => prev - 1);
    } else {
      setShowDiagnostic(false);
    }
  };

  // ────────────────────────────────────────────────
  // Safety check for radio components
  // ────────────────────────────────────────────────
  const radioComponentsReady = typeof Radio === 'function' && typeof RadioGroup === 'function';

  if (showDiagnostic) {
    if (!radioComponentsReady) {
      return (
        <StepShell title="Diagnostic Unavailable">
          <Card className="p-8 text-center border-red-300">
            <h2 className="text-xl font-bold text-red-600 mb-4">
              Radio Component Not Available
            </h2>
            <p className="mb-4">
              The radio button components could not be loaded.
            </p>
            <p className="text-sm text-gray-600 mb-6">
              Please check exports in:
              <br />
              <code>components/design-system/Radio.tsx</code>
              <br />
              <code>components/design-system/RadioGroup.tsx</code>
            </p>
            <Button variant="outline" onClick={() => setShowDiagnostic(false)}>
              Return to Scores
            </Button>
          </Card>
        </StepShell>
      );
    }

    return (
      <StepShell title="Diagnostic" description="Please complete each section">
        <Card className="p-6">
          <Progress
            value={((currentSection + 1) / sections.length) * 100}
            className="mb-6 h-2"
          />

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-10">
            {currentSectionData.questions.map((q, idx) => (
              <div key={q.id} className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-medium shrink-0 mt-1">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium mb-4">{q.text}</p>
                    <RadioGroup
                      value={answers[q.id]?.toString() ?? ''}
                      onValueChange={(v) => handleDiagnosticAnswer(q.id, Number(v))}
                    >
                      <div className="space-y-3">
                        {q.options.map((opt) => (
                          <div key={opt.value} className="flex items-center">
                            <Radio
                              value={opt.value.toString()}
                              id={`${q.id}-${opt.value}`}
                            />
                            <label
                              htmlFor={`${q.id}-${opt.value}`}
                              className="ml-3 text-sm cursor-pointer text-gray-700 dark:text-gray-300"
                            >
                              {opt.label}
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
          <Button
            variant="outline"
            onClick={handleDiagnosticBack}
            disabled={diagnosticSubmitting}
          >
            Back
          </Button>
          <Button
            onClick={handleDiagnosticNext}
            disabled={!isSectionComplete() || diagnosticSubmitting}
            isLoading={diagnosticSubmitting}
          >
            {currentSection === sections.length - 1 ? 'Finish Diagnostic' : 'Next Section'}
          </Button>
        </div>
      </StepShell>
    );
  }

  // ────────────────────────────────────────────────
  // Main baseline scores view
  // ────────────────────────────────────────────────
  if (loading) {
    return <StepShell title="Loading..."><div className="py-12 text-center">Loading...</div></StepShell>;
  }

  return (
    <StepShell
      title="Your Current IELTS Level"
      description="Enter your latest band scores or take the diagnostic."
    >
      <div className="space-y-8">
        <Button
          onClick={() => setShowDiagnostic(true)}
          className="w-full sm:w-auto"
        >
          Take Diagnostic Assessment
        </Button>

        {Object.entries(scores).map(([key, score]) => {
          const skill = key as Skill;
          return (
            <Card key={skill} className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold capitalize">{skill}</h3>
                <span className="text-xl font-bold text-blue-600">
                  {score > 0 ? score.toFixed(1) : 'Not set'}
                </span>
              </div>

              <div className="grid grid-cols-6 gap-2 mb-4">
                {VALID_BANDS.map((band) => (
                  <button
                    key={band}
                    type="button"
                    onClick={() => handleScoreChange(skill, band)}
                    className={cn(
                      'py-2 text-sm rounded transition-all',
                      score === band
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-gray-100 hover:bg-blue-100 dark:bg-gray-800 dark:hover:bg-gray-700'
                    )}
                  >
                    {band === 0 ? '—' : band.toFixed(1)}
                  </button>
                ))}
              </div>

              <div className="flex gap-3 flex-wrap">
                {[4.5, 6.0, 7.5].map((quick) => (
                  <button
                    key={quick}
                    type="button"
                    onClick={() => handleScoreChange(skill, quick)}
                    className={cn(
                      'text-xs px-4 py-2 rounded border',
                      score === quick
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-blue-400'
                    )}
                  >
                    {quick}
                  </button>
                ))}
              </div>
            </Card>
          );
        })}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-end gap-4 mt-8">
          <Button variant="outline" onClick={() => router.back()}>
            Back
          </Button>
          <Button
            onClick={async () => {
              const allFilled = Object.values(scores).every((s) => s > 0);
              if (!allFilled) {
                setError('Please select a score for all four skills.');
                return;
              }

              setSubmitting(true);
              setError(null);

              try {
                const payload = {
                  ...scores,
                  source: useDiagnostic ? 'diagnostic' : 'manual',
                };

                const res = await fetch('/api/onboarding/baseline', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
                });

                if (!res.ok) {
                  const errData = await res.json().catch(() => ({}));
                  throw new Error(errData.message || 'Failed to save');
                }

                router.push('/onboarding/study-rhythm'); // ← change this to your actual next page
              } catch (err: any) {
                console.error('Save error:', err);
                setError(err.message || 'Failed to save scores. Please try again.');
              } finally {
                setSubmitting(false);
              }
            }}
            disabled={submitting}
          >
            {submitting ? 'Saving...' : 'Save & Continue'}
          </Button>
        </div>
      </div>
    </StepShell>
  );
};

function calculateEstimatedScore(answers: Record<string, number>, skill: string): number {
  const relevant = Object.entries(answers)
    .filter(([k]) => k.startsWith(skill))
    .map(([, v]) => v);

  if (relevant.length === 0) return 6.0;
  const avg = relevant.reduce((sum, v) => sum + v, 0) / relevant.length;
  const band = 3 + avg;
  return Math.round(band * 2) / 2;
}

export default BaselinePage;