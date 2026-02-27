import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import SectionTest, {
  SectionResult,
  SectionTestHandle,
} from '@/components/mock-tests/SectionTest';
import { mockSections } from '@/data/mock';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import ExamLayout from '@/components/layouts/ExamLayout';

const modules = ['listening', 'reading', 'writing', 'speaking'] as const;

type SectionKey = (typeof modules)[number];

type Progress = {
  current: number;
  results: SectionResult[];
};

type Mode = 'simulation' | 'practice';

type FullSummary = {
  date: string;
  overallBand: number;
  sections: SectionResult[];
  mode: Mode;
};

type ResumeState = {
  progress: Progress;
  mode: Mode;
};

const createDefaultProgress = (): Progress => ({ current: 0, results: [] });

const sectionMeta: Record<SectionKey, { title: string; description: string; practiceHref: string }> = {
  listening: {
    title: 'Listening',
    description: '4 parts · 40 minutes · Academic + General Training audio tasks.',
    practiceHref: '/mock/listening',
  },
  reading: {
    title: 'Reading',
    description: '3 passages · 60 minutes · Band-calibrated comprehension sets.',
    practiceHref: '/mock/reading',
  },
  writing: {
    title: 'Writing',
    description: 'Tasks 1 & 2 · AI scoring with coherence and lexical feedback.',
    practiceHref: '/writing/mock',
  },
  speaking: {
    title: 'Speaking',
    description: 'Parts 1–3 · Interactive prompts with instant transcripts.',
    practiceHref: '/mock/speaking',
  },
};

function formatSectionTitle(section: SectionKey) {
  return sectionMeta[section].title;
}

function formatAttemptDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

function generateAiFeedback(summary: FullSummary) {
  const ordered = [...summary.sections].sort((a, b) => a.band - b.band);
  const weakest = ordered[0];
  const strongest = ordered[ordered.length - 1];
  const overview =
    summary.mode === 'simulation'
      ? `AI review: Your simulated overall band is ${summary.overallBand.toFixed(
          1
        )}. Keep exam conditions in mind — focus and timing were tracked during this attempt.`
      : `AI review: Practice mode overall band is ${summary.overallBand.toFixed(
          1
        )}. Because practice shows answers on the fly, use this score to benchmark rather than an official prediction.`;

  const tips = summary.sections.map((section) => {
    const accuracy = Math.round((section.correct / section.total) * 100);
    if (section.band >= 7.5) {
      return `${formatSectionTitle(section.section as SectionKey)} is a standout (${accuracy}% accuracy). Maintain consistency with spaced mock refreshers.`;
    }
    if (section.band >= 6.5) {
      return `${formatSectionTitle(section.section as SectionKey)} is on track (${accuracy}% accuracy). Practise complex question types to push into band 7.`;
    }
    return `${formatSectionTitle(section.section as SectionKey)} needs attention (${accuracy}% accuracy). Revisit strategy lessons and targeted drills before your next simulation.`;
  });

  if (weakest && strongest && weakest.section !== strongest.section) {
    tips.unshift(
      `${formatSectionTitle(weakest.section as SectionKey)} trailed behind ${formatSectionTitle(
        strongest.section as SectionKey
      )}. Balance your prep by scheduling an extra practice set for ${formatSectionTitle(weakest.section as SectionKey)}.`
    );
  }

  return { overview, tips };
}

export default function FullTestPage() {
  const [stage, setStage] = useState<'menu' | 'exam' | 'results'>('menu');
  const [mode, setMode] = useState<Mode>('simulation');
  const [progress, setProgress] = useState<Progress>(() => createDefaultProgress());
  const [final, setFinal] = useState<FullSummary | null>(null);
  const [history, setHistory] = useState<FullSummary[]>([]);
  const [resumeState, setResumeState] = useState<ResumeState | null>(null);
  const [aiOverview, setAiOverview] = useState('');
  const [aiTips, setAiTips] = useState<string[]>([]);
  const testRef = useRef<SectionTestHandle>(null);

  // bootstrap from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const storedHistory = JSON.parse(
        window.localStorage.getItem('full-test-results') || '[]'
      ) as FullSummary[];
      if (Array.isArray(storedHistory)) {
        const orderedHistory = [...storedHistory].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setHistory(orderedHistory);
      }
    } catch {
      // ignore
    }
    try {
      const saved = window.localStorage.getItem('full-test-progress');
      if (saved) {
        const parsed = JSON.parse(saved) as Progress & { mode?: Mode };
        if (
          parsed &&
          typeof parsed.current === 'number' &&
          Array.isArray(parsed.results)
        ) {
          setResumeState({
            progress: {
              current: Math.min(parsed.current, modules.length - 1),
              results: parsed.results,
            },
            mode: parsed.mode === 'practice' ? 'practice' : 'simulation',
          });
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // persist progress while in exam flow
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (stage !== 'exam') return;
    try {
      window.localStorage.setItem(
        'full-test-progress',
        JSON.stringify({ ...progress, mode })
      );
    } catch {
      // ignore
    }
  }, [progress, mode, stage]);

  // clear stored progress once results are shown
  useEffect(() => {
    if (stage !== 'results' || typeof window === 'undefined') return;
    window.localStorage.removeItem('full-test-progress');
    setResumeState(null);
  }, [stage]);

  const currentIndex = progress.current;

  const currentSection: SectionKey | null = useMemo(() => {
    if (stage !== 'exam') return null;
    const key = modules[currentIndex];
    return key ?? modules[modules.length - 1];
  }, [currentIndex, stage]);

  const sectionData = currentSection ? mockSections[currentSection] : null;

  const handleStart = (nextMode: Mode) => {
    setMode(nextMode);
    setStage('exam');
    setFinal(null);
    setAiOverview('');
    setAiTips([]);
    setProgress(createDefaultProgress());
    setResumeState(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('full-test-progress');
    }
  };

  const handleResume = () => {
    if (!resumeState) return;
    setMode(resumeState.mode);
    setProgress(resumeState.progress);
    setStage('exam');
    setFinal(null);
    setAiOverview('');
    setAiTips([]);
  };

  const resetToMenu = () => {
    setStage('menu');
    setProgress(createDefaultProgress());
    setFinal(null);
    setAiOverview('');
    setAiTips([]);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('full-test-progress');
    }
  };

  const handleSectionComplete = (res: SectionResult) => {
    setProgress((prev) => {
      const nextResults = [...prev.results, res];
      const nextIndex = prev.current + 1;
      if (nextIndex < modules.length) {
        return { current: nextIndex, results: nextResults };
      }

      const overallBand =
        nextResults.reduce((sum, r) => sum + r.band, 0) / nextResults.length;
      const summary: FullSummary = {
        date: new Date().toISOString(),
        overallBand,
        sections: nextResults,
        mode,
      };

      const feedback = generateAiFeedback(summary);
      setAiOverview(feedback.overview);
      setAiTips(feedback.tips);
      setFinal(summary);
      setStage('results');

      setHistory((prevHistory) => {
        const combined = [summary, ...prevHistory];
        const ordered = combined.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem('full-test-results', JSON.stringify(ordered));
          } catch {
            // ignore
          }
        }
        return ordered;
      });

      return { current: nextIndex, results: nextResults };
    });
  };

  if (stage === 'exam' && currentSection && sectionData) {
    const sectionTitle = `${mode === 'simulation' ? 'Simulation' : 'Practice'} · ${formatSectionTitle(
      currentSection
    )}`;

    return (
      <ExamLayout
        exam="mock-test"
        slug={`full-${currentSection}`}
        title={sectionTitle}
        seconds={sectionData.duration}
        onElapsed={mode === 'simulation' ? () => testRef.current?.submit() : undefined}
        focusMode={{ active: stage === 'exam' && mode === 'simulation' }}
      >
        <div className="space-y-4">
          <Card className="rounded-ds-2xl border border-dashed border-border/60 bg-card/40 p-4 text-sm text-muted-foreground">
            {mode === 'simulation' ? (
              <p>
                Focus mode is on. Stay within the exam window — tab switches are logged and the
                timer will auto-submit when it expires.
              </p>
            ) : (
              <p>
                Practice mode is relaxed. Timer is for guidance only and you will see answer
                feedback under each question.
              </p>
            )}
          </Card>
          <SectionTest
            ref={testRef}
            section={currentSection}
            questions={sectionData.questions}
            mode={mode}
            onComplete={handleSectionComplete}
          />
        </div>
      </ExamLayout>
    );
  }

  if (stage === 'results' && final) {
    return (
      <section className="bg-lightBg py-24 dark:bg-dark">
        <Container className="space-y-8">
          <Card className="rounded-ds-2xl p-6">
            <h1 className="font-slab text-h3 text-gradient-primary">AI-powered results</h1>
            <p className="mt-2 text-body text-muted-foreground">
              {aiOverview ||
                `Overall band: ${final.overallBand.toFixed(1)}. Review the sections below to plan your next steps.`}
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {final.sections.map((section) => (
                <Card key={section.section} className="rounded-ds-xl border bg-card/60 p-4">
                  <h2 className="text-h5 font-semibold">
                    {formatSectionTitle(section.section as SectionKey)}
                  </h2>
                  <dl className="mt-3 space-y-1 text-sm">
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">Band</dt>
                      <dd className="font-medium">{section.band.toFixed(1)}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">Accuracy</dt>
                      <dd className="font-medium">
                        {section.correct} / {section.total}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">Time on task</dt>
                      <dd className="font-medium">{section.timeTaken}s</dd>
                    </div>
                  </dl>
                </Card>
              ))}
            </div>
          </Card>

          <Card className="rounded-ds-2xl p-6">
            <h2 className="font-slab text-h4">AI feedback</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Smart insights tailor the next steps for your {mode === 'simulation' ? 'simulation' : 'practice'}
              attempt.
            </p>
            <ul className="mt-4 space-y-3 text-sm">
              {aiTips.map((tip, index) => (
                <li key={index} className="rounded-ds-xl bg-card/50 p-3">
                  {tip}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="rounded-ds-2xl p-6">
            <h2 className="font-slab text-h4">History</h2>
            {history.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No previous attempts yet. Your future simulations will appear here with AI notes.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {history.slice(0, 5).map((attempt, index) => (
                  <li key={attempt.date + index} className="rounded-ds-xl bg-card/50 p-3 text-sm">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium">
                          {formatAttemptDate(attempt.date)} · {attempt.mode === 'simulation' ? 'Simulation' : 'Practice'}
                        </p>
                        <p className="text-muted-foreground">
                          Overall band {attempt.overallBand.toFixed(1)}
                        </p>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        Detailed review coming soon
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button href="/mock" variant="secondary" tone="primary" as={Link}>
              Back to mock tests
            </Button>
            <Button onClick={resetToMenu} variant="primary">
              Plan more practice
            </Button>
            <Button onClick={() => handleStart('simulation')} variant="outline">
              Start a new simulation
            </Button>
          </div>
        </Container>
      </section>
    );
  }

  // menu stage
  return (
    <section className="bg-lightBg py-24 dark:bg-dark">
      <Container className="space-y-12">
        <div className="max-w-3xl space-y-4">
          <h1 className="font-slab text-display text-gradient-primary">Full mock exam hub</h1>
          <p className="text-body text-muted-foreground">
            Choose simulation to mimic real test pressure or switch to practice mode for guided
            learning. You can always return to this hub to review results, jump into history, or try
            a specific module.
          </p>
        </div>

        {resumeState && (
          <Card className="flex flex-col gap-4 rounded-ds-2xl border border-primary/40 bg-primary/5 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-h5 font-semibold">Resume in-progress mock</h2>
              <p className="text-sm text-muted-foreground">
                You paused a {resumeState.mode === 'simulation' ? 'simulation' : 'practice'} at the
                {formatSectionTitle(modules[resumeState.progress.current])} section.
              </p>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleResume} variant="primary">
                Resume now
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setResumeState(null);
                  setProgress(createDefaultProgress());
                  if (typeof window !== 'undefined') {
                    window.localStorage.removeItem('full-test-progress');
                  }
                }}
              >
                Start over
              </Button>
            </div>
          </Card>
        )}

        <Card className="grid gap-4 rounded-ds-2xl bg-card/60 p-6 md:grid-cols-[1.5fr_minmax(0,1fr)] md:items-center">
          <div className="space-y-3">
            <h2 className="text-h3 font-semibold">Full mock exam</h2>
            <p className="text-body text-muted-foreground">
              Sit the complete IELTS flow — listening, reading, writing, and speaking in one
              sequence. AI captures focus, timing, and accuracy to predict your band score.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button onClick={() => handleStart('simulation')} variant="primary" fullWidth>
              Simulation mode
            </Button>
            <Button onClick={() => handleStart('practice')} variant="secondary" fullWidth>
              Practice mode
            </Button>
          </div>
        </Card>

        <div className="space-y-6">
          <h2 className="text-h4 font-semibold">Module shortcuts</h2>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {modules.map((section) => (
              <Card key={section} className="flex flex-col justify-between rounded-ds-2xl bg-card/60 p-6">
                <div className="space-y-3">
                  <h3 className="text-h5 font-semibold">{formatSectionTitle(section)}</h3>
                  <p className="text-sm text-muted-foreground">{sectionMeta[section].description}</p>
                </div>
                <div className="mt-6 space-y-2">
                  <Button
                    href={`${sectionMeta[section].practiceHref}?mode=simulation`}
                    as={Link}
                    variant="outline"
                    fullWidth
                  >
                    Quick simulation
                  </Button>
                  <Button
                    href={`${sectionMeta[section].practiceHref}?mode=practice`}
                    as={Link}
                    variant="soft"
                    tone="primary"
                    fullWidth
                  >
                    Guided practice
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
