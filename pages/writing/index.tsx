// pages/writing/index.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { Container } from '@/components/design-system/Container';
import { AiTestDrive } from '@/components/ai/AiTestDrive';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Input } from '@/components/design-system/Input';
import { Alert } from '@/components/design-system/Alert';
import { Badge } from '@/components/design-system/Badge';
import { writingExamSummaries } from '@/data/writing/exam-index';
import { gradeWriting } from '@/lib/ai/writing';

type TaskType = 'T1' | 'T2' | 'GT';
type Mode = 'practice' | 'exam';

const MIN_WORDS: Record<TaskType, number> = { T1: 150, GT: 150, T2: 250 };
const TARGET_MINUTES: Record<TaskType, number> = { T1: 20, GT: 20, T2: 40 };

function useSample({
  setTaskType,
  setPrompt,
  setLetterType,
  setTone,
  setEssay,
  setNotes,
  setIntro,
  setBp1,
  setBp2,
  setConclusion,
}: {
  setTaskType: React.Dispatch<React.SetStateAction<TaskType>>;
  setPrompt: React.Dispatch<React.SetStateAction<string>>;
  setLetterType: React.Dispatch<React.SetStateAction<'formal' | 'informal' | 'semi-formal'>>;
  setTone: React.Dispatch<React.SetStateAction<'neutral' | 'polite' | 'friendly'>>;
  setEssay: React.Dispatch<React.SetStateAction<string>>;
  setNotes: React.Dispatch<React.SetStateAction<string>>;
  setIntro: React.Dispatch<React.SetStateAction<string>>;
  setBp1: React.Dispatch<React.SetStateAction<string>>;
  setBp2: React.Dispatch<React.SetStateAction<string>>;
  setConclusion: React.Dispatch<React.SetStateAction<string>>;
}) {
  return useCallback(
    (kind: TaskType) => {
      setTaskType(kind);
      if (kind === 'T1') {
        setPrompt(
          'The chart below shows the percentage of households in different income groups with access to the internet between 2005 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
        );
      } else if (kind === 'T2') {
        setPrompt(
          'Some people think that schools should reward students who show the best academic results, while others believe that it is more important to reward students who show improvements. Discuss both views and give your own opinion.',
        );
      } else {
        setPrompt(
          'You recently moved to a new city and want to inform your friend about your new address and invite them to visit. Write a letter explaining your move, giving the new address, and suggesting a date to meet.',
        );
        setLetterType('informal');
        setTone('friendly');
      }
      setEssay('');
      setNotes('');
      setIntro('');
      setBp1('');
      setBp2('');
      setConclusion('');
    },
    [setTaskType, setPrompt, setLetterType, setTone, setEssay, setNotes, setIntro, setBp1, setBp2, setConclusion],
  );
}

export default function WritingHome() {
  const router = useRouter();

  const [taskType, setTaskType] = useState<TaskType>('T2');
  const [mode, setMode] = useState<Mode>('practice');
  const [examActive, setExamActive] = useState(false);

  const [prompt, setPrompt] = useState('');
  const [essay, setEssay] = useState('');

  // GT-only
  const [letterType, setLetterType] = useState<'formal' | 'informal' | 'semi-formal'>('formal');
  const [tone, setTone] = useState<'neutral' | 'polite' | 'friendly'>('neutral');

  // Helpers
  const [useOutline, setUseOutline] = useState(false);
  const [notes, setNotes] = useState('');
  const [intro, setIntro] = useState('');
  const [bp1, setBp1] = useState('');
  const [bp2, setBp2] = useState('');
  const [conclusion, setConclusion] = useState('');

  // Timer
  const [timerRunning, setTimerRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(TARGET_MINUTES['T2'] * 60);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const loadSample = useSample({
    setTaskType,
    setPrompt,
    setLetterType,
    setTone,
    setEssay,
    setNotes,
    setIntro,
    setBp1,
    setBp2,
    setConclusion,
  });

  // ---- Derived ----
  const wordCount = useMemo(
    () => (essay.trim() ? essay.trim().split(/\s+/).filter(Boolean).length : 0),
    [essay],
  );
  const minWords = MIN_WORDS[taskType];
  const belowMin = wordCount > 0 && wordCount < minWords;

  // very simple repetition signal (practice quality hint)
  const repetitionHint = useMemo(() => {
    if (!essay) return null;
    const words = essay
      .toLowerCase()
      .replace(/[^a-z\s']/g, ' ')
      .split(/\s+/)
      .filter((w) => w && w.length > 3);
    if (words.length < 80) return null;
    const freq: Record<string, number> = {};
    for (const w of words) freq[w] = (freq[w] || 0) + 1;
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 1)[0];
    if (!top) return null;
    const [wd, n] = top;
    return n >= 8 ? `You used “${wd}” ${n} times. Try synonyms to improve Lexical Resource.` : null;
  }, [essay]);

  const examLocked = mode === 'exam' && examActive;

  const disabled = useMemo(() => {
    if (!prompt.trim() || !essay.trim()) return true;
    if (mode === 'exam' && !examActive) return true;
    if (mode === 'exam' && belowMin) return true; // enforce minimum in exam mode
    return false;
  }, [prompt, essay, mode, belowMin, examActive]);

  // ---- Timer logic ----
  useEffect(() => {
    setSecondsLeft(TARGET_MINUTES[taskType] * 60);
    setTimerRunning(false);
    setExamActive(false);
  }, [taskType]);

  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  useEffect(() => {
    if (secondsLeft === 0 && timerRunning) {
      setTimerRunning(false);
    }
  }, [secondsLeft, timerRunning]);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  // ---- Autosave / Resume (localStorage) ----
  const STORAGE_KEY = (t: TaskType) => `writing_draft_${t}`;

  useEffect(() => {
    if (typeof window === 'undefined') return; // SSR guard
    try {
      const raw = localStorage.getItem(STORAGE_KEY(taskType));
      if (!raw) return;
      const j = JSON.parse(raw);
      setPrompt(j.prompt ?? '');
      setEssay(j.essay ?? '');
      setNotes(j.notes ?? '');
      setIntro(j.intro ?? '');
      setBp1(j.bp1 ?? '');
      setBp2(j.bp2 ?? '');
      setConclusion(j.conclusion ?? '');
      if (taskType === 'GT') {
        setLetterType((j.letterType as 'formal' | 'informal' | 'semi-formal') ?? 'formal');
        setTone((j.tone as 'neutral' | 'polite' | 'friendly') ?? 'neutral');
      }
    } catch {}
  }, [taskType]);

  useEffect(() => {
    if (typeof window === 'undefined') return; // SSR guard
    const payload = {
      prompt,
      essay,
      notes,
      intro,
      bp1,
      bp2,
      conclusion,
      ...(taskType === 'GT' ? { letterType, tone } : {}),
    };
    try {
      localStorage.setItem(STORAGE_KEY(taskType), JSON.stringify(payload));
    } catch {}
  }, [prompt, essay, notes, intro, bp1, bp2, conclusion, taskType, letterType, tone]);

  const clearDraft = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY(taskType));
      } catch {}
    }
    setPrompt('');
    setEssay('');
    setNotes('');
    setIntro('');
    setBp1('');
    setBp2('');
    setConclusion('');
  };

  // ---- Submit ----
  const submit = async () => {
    setErr(null);
    setLoading(true);
    try {
      // Map our UI task type to API task
      const apiTask: 'task1' | 'task2' = taskType === 'T2' ? 'task2' : 'task1';
      const res = await gradeWriting({
        text: essay,
        task: apiTask,
        words: wordCount,
        language: 'en',
        persist: true, // let backend upsert attempt if configured
      });

      if (!res.ok) {
        throw new Error(res.error || 'Evaluation failed');
      }

      // If API persisted an attempt, it may return an id; otherwise show inline success
      const anyRes = res as any;
      const id: string | undefined = anyRes.id || anyRes.attemptId;
      if (id) {
        // Your review route is /review/writing/[id].tsx per structure
        router.push(`/review/writing/${id}`);
      } else {
        // Fallback: show a quick inline success (simple alert)
        alert(`Estimated band: ${res.band ?? '—'}`);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const changeMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setTimerRunning(false);
    setSecondsLeft(TARGET_MINUTES[taskType] * 60);
    setExamActive(false);
  };

  return (
    <>
      <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <Container>
          {/* 👇 New: quick AI tester */}
          {mode === 'practice' && <AiTestDrive className="mb-8" />}

        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-slab text-h1 md:text-display">IELTS Writing</h1>
            <p className="text-grayish mt-1">
              Create an attempt, get AI scores & rubric breakdown, then re-evaluate.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="neutral" size="sm">
              Task 1 (AC)
            </Badge>
            <Badge variant="neutral" size="sm">
              Task 2 (Essay)
            </Badge>
            <Badge variant="neutral" size="sm">
              General Training Letter
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr] mt-6">
          {/* Left: main form */}
          <Card className="card-surface p-6 rounded-ds-2xl">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div>
                <h3 className="text-h3">New Writing Attempt</h3>
                <p className="text-grayish mt-1">Fill the prompt and your response, then evaluate.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-small text-grayish">Mode</span>
                <div className="flex rounded-ds border border-lightBorder dark:border-white/10 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => changeMode('practice')}
                    className={`px-3 py-2 ${mode === 'practice' ? 'bg-electricBlue/10 text-electricBlue' : ''}`}
                    aria-pressed={mode === 'practice'}
                    disabled={examLocked}
                  >
                    Practice
                  </button>
                  <button
                    type="button"
                    onClick={() => changeMode('exam')}
                    className={`px-3 py-2 ${mode === 'exam' ? 'bg-electricBlue/10 text-electricBlue' : ''}`}
                    aria-pressed={mode === 'exam'}
                    disabled={examLocked}
                  >
                    Exam
                  </button>
                </div>
              </div>
            </div>

            {/* Task type */}
            <div className="mt-4 grid sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTaskType('T1')}
                className={`p-3.5 rounded-ds border border-lightBorder dark:border-white/10 ${
                  taskType === 'T1' ? 'bg-electricBlue/10 text-electricBlue border-electricBlue/30' : ''
                }`}
                disabled={examLocked}
              >
                Task 1 (Academic)
              </button>
              <button
                type="button"
                onClick={() => setTaskType('T2')}
                className={`p-3.5 rounded-ds border border-lightBorder dark:border-white/10 ${
                  taskType === 'T2' ? 'bg-electricBlue/10 text-electricBlue border-electricBlue/30' : ''
                }`}
                disabled={examLocked}
              >
                Task 2 (Essay)
              </button>
              <button
                type="button"
                onClick={() => setTaskType('GT')}
                className={`p-3.5 rounded-ds border border-lightBorder dark:border-white/10 ${
                  taskType === 'GT' ? 'bg-electricBlue/10 text-electricBlue border-electricBlue/30' : ''
                }`}
                disabled={examLocked}
              >
                General Training (Letter)
              </button>
            </div>

            {/* GT extras */}
            {taskType === 'GT' && (
              <div className="mt-4 grid sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 inline-block text-small text-grayish dark:text-grayish">
                    Letter type
                  </span>
                  <select
                    className="w-full p-3.5 rounded-ds border border-lightBorder dark:border-white/10 bg-white dark:bg-dark"
                    value={letterType}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setLetterType(e.target.value as 'formal' | 'informal' | 'semi-formal')
                    }
                    disabled={examLocked}
                  >
                    <option value="formal">Formal</option>
                    <option value="semi-formal">Semi-formal</option>
                    <option value="informal">Informal</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 inline-block text-small text-grayish dark:text-grayish">
                    Tone
                  </span>
                  <select
                    className="w-full p-3.5 rounded-ds border border-lightBorder dark:border-white/10 bg-white dark:bg-dark"
                    value={tone}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setTone(e.target.value as 'neutral' | 'polite' | 'friendly')
                    }
                    disabled={examLocked}
                  >
                    <option value="neutral">Neutral</option>
                    <option value="polite">Polite</option>
                    <option value="friendly">Friendly</option>
                  </select>
                </label>
              </div>
            )}

            {/* Prompt */}
            <div className="mt-4">
              <Input
                label="Prompt / Question"
                placeholder="Paste your task prompt here…"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                readOnly={examLocked}
              />
            </div>

            {/* Outline toggle */}
            <div className="mt-3 flex items-center gap-2">
              <input
                id="outline"
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={useOutline}
                onChange={(e) => setUseOutline(e.target.checked)}
              />
              <label htmlFor="outline" className="text-small text-grayish">
                Use outline & brainstorm helpers
              </label>
            </div>

            {useOutline && (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 inline-block text-small text-grayish dark:text-grayish">
                    Notes / Brainstorm
                  </span>
                  <textarea
                    className="w-full min-h={[90]} p-3.5 rounded-ds border border-lightBorder dark:border-white/10 bg-white dark:bg-dark text-lightText dark:text-white placeholder-gray-500 dark:placeholder-white/40 focus-visible:outline-none"
                    placeholder="Keywords, examples, data points…"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 inline-block text-small text-grayish dark:text-grayish">
                    Introduction
                  </span>
                  <textarea
                    className="w-full min-h-[90px] p-3.5 rounded-ds border border-lightBorder dark:border-white/10 bg-white dark:bg-dark text-lightText dark:text-white placeholder-gray-500 dark:placeholder-white/40 focus-visible:outline-none"
                    value={intro}
                    onChange={(e) => setIntro(e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 inline-block text-small text-grayish dark:text-grayish">
                    Body Paragraph 1
                  </span>
                  <textarea
                    className="w-full min-h-[90px] p-3.5 rounded-ds border border-lightBorder dark:border-white/10 bg-white dark:bg-dark text-lightText dark:text-white placeholder-gray-500 dark:placeholder-white/40 focus-visible:outline-none"
                    value={bp1}
                    onChange={(e) => setBp1(e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 inline-block text-small text-grayish dark:text-grayish">
                    Body Paragraph 2
                  </span>
                  <textarea
                    className="w-full min-h-[90px] p-3.5 rounded-ds border border-lightBorder dark:border-white/10 bg-white dark:bg-dark text-lightText dark:text-white placeholder-gray-500 dark:placeholder-white/40 focus-visible:outline-none"
                    value={bp2}
                    onChange={(e) => setBp2(e.target.value)}
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-1.5 inline-block text-small text-grayish dark:text-grayish">
                    Conclusion
                  </span>
                  <textarea
                    className="w-full min-h-[90px] p-3.5 rounded-ds border border-lightBorder dark:border-white/10 bg-white dark:bg-dark text-lightText dark:text-white placeholder-gray-500 dark:placeholder-white/40 focus-visible:outline-none"
                    value={conclusion}
                    onChange={(e) => setConclusion(e.target.value)}
                  />
                </label>
              </div>
            )}

            {/* Essay textarea */}
            <div className="mt-3">
              <label className="block">
                <span className="mb-1.5 inline-block text-small text-grayish dark:text-grayish">
                  Your response
                </span>
                <textarea
                  className="w-full min-h-[260px] p-4 rounded-ds border border-lightBorder dark:border-white/10 bg-white dark:bg-dark text-lightText dark:text-white placeholder-gray-500 dark:placeholder-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus:border-primary"
                  placeholder="Write your essay here…"
                  value={essay}
                  onChange={(e) => setEssay(e.target.value)}
                />
              </label>

              {/* Wordcount / thresholds */}
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <Badge variant={belowMin ? 'warning' : 'success'} size="sm">
                  {wordCount} words • minimum {minWords}
                </Badge>
                {repetitionHint && <Badge variant="info" size="sm">{repetitionHint}</Badge>}
              </div>
            </div>

            {err && (
              <Alert variant="warning" title="Failed" className="mt-4">
                {err}
              </Alert>
            )}

            {/* Actions */}
            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={submit} disabled={disabled || loading} variant="primary" className="rounded-ds-xl">
                {mode === 'exam' ? (loading ? 'Submitting…' : 'Submit attempt') : loading ? 'Evaluating…' : 'Evaluate & Review'}
              </Button>
              <Button
                onClick={() => loadSample(taskType)}
                variant="secondary"
                className="rounded-ds-xl"
                disabled={loading || examLocked}
              >
                Use sample for {taskType === 'GT' ? 'GT Letter' : taskType}
              </Button>
              <Button
                onClick={clearDraft}
                variant="secondary"
                className="rounded-ds-xl"
                disabled={loading || examLocked}
              >
                Clear draft
              </Button>
            </div>
          </Card>

          {/* Right: helpers */}
          <div className="grid gap-6">
            {/* Timer card */}
            <Card className="card-surface p-6 rounded-ds-2xl">
              <h3 className="text-h3">Timer</h3>
              <p className="text-grayish mt-1">
                Target: {TARGET_MINUTES[taskType]} minutes for {taskType}.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div className="text-h1 font-semibold tabular-nums">
                  {mm}:{ss}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    className="rounded-ds-xl"
                    onClick={() => {
                      setTimerRunning(true);
                      if (mode === 'exam') setExamActive(true);
                    }}
                    disabled={timerRunning || (mode === 'exam' && examActive)}
                  >
                    {mode === 'exam' ? (examActive ? 'Exam running' : 'Begin exam') : 'Start'}
                  </Button>
                  <Button
                    variant="secondary"
                    className="rounded-ds-xl"
                    onClick={() => setTimerRunning(false)}
                    disabled={!timerRunning || mode === 'exam'}
                  >
                    Pause
                  </Button>
                  <Button
                    variant="secondary"
                    className="rounded-ds-xl"
                    onClick={() => {
                      setTimerRunning(false);
                      setSecondsLeft(TARGET_MINUTES[taskType] * 60);
                    }}
                    disabled={mode === 'exam'}
                  >
                    Reset
                  </Button>
                </div>
              </div>
              {mode === 'exam' && !examActive && (
                <Alert variant="info" className="mt-3" title="Exam mode not started">
                  Click "Begin exam" to lock the interface and start the official timer. Submission is disabled until the exam is
                  in progress.
                </Alert>
              )}
              {mode === 'exam' && belowMin && (
                <Alert variant="warning" className="mt-3" title="Word count below minimum">
                  In exam mode you must reach at least {minWords} words before submitting.
                </Alert>
              )}
              {mode === 'exam' && examActive && (
                <Alert variant="warning" className="mt-3" title="Exam controls locked">
                  During the exam you can’t change task type, switch modes, restart the timer, or clear the prompt. Finish your
                  response and use "Submit attempt" when ready.
                </Alert>
              )}
            </Card>

            <Card className="card-surface p-6 rounded-ds-2xl">
              <h3 className="text-h3">How this works</h3>
              <ul className="list-disc pl-6 mt-2 space-y-1 text-grayish">
                <li>
                  Select <b>Task</b> and <b>Mode</b> (Practice/Exam).
                </li>
                <li>
                  Use <b>Outline</b> to plan; write your response.
                </li>
                <li>Autosave keeps drafts per task. You can clear anytime.</li>
                <li>
                  Click <b>{mode === 'exam' ? 'Submit attempt' : 'Evaluate & Review'}</b> to get AI band & rubric feedback.
                </li>
                <li>
                  On the review page, use <b>AI Re-evaluation</b> to iterate.
                </li>
              </ul>
            </Card>
          </div>
        </div>
        </Container>
      </section>

      <section className="py-20 bg-white dark:bg-dark/60">
        <Container>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-h2 font-slab">Full exam practice sets</h2>
              <p className="mt-2 max-w-3xl text-grayish">
                Choose a complete IELTS Writing mock with both tasks, practise your response, and then launch the timed
                exam to submit for AI scoring and feedback in the review portal.
              </p>
            </div>
            <Badge variant="info" size="sm">
              10 mock tests
            </Badge>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {writingExamSummaries.map((paper) => (
              <Card key={paper.id} className="card-surface h-full rounded-ds-2xl p-6">
                <div className="flex h-full flex-col gap-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-h3 font-semibold">{paper.title}</h3>
                      <p className="mt-1 text-grayish">{paper.description}</p>
                    </div>
                    <Badge variant="neutral" size="sm">
                      {paper.task1Type}
                    </Badge>
                  </div>

                  <div className="grid gap-1 text-caption text-grayish">
                    <span>Task 1: {paper.task1Focus}</span>
                    <span>Task 2: {paper.task2Focus}</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="neutral" size="sm">
                      {paper.durationMinutes} min total
                    </Badge>
                    {paper.tags.map((tag) => (
                      <Badge key={tag} variant="info" size="sm" className="capitalize">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-3">
                    <Button
                      href={`/writing/${paper.id}`}
                      variant="secondary"
                      className="rounded-ds-xl"
                      elevateOnHover
                    >
                      Plan &amp; outline
                    </Button>
                    <Button
                      href={`/mock/writing/${paper.id}`}
                      className="rounded-ds-xl"
                      elevateOnHover
                    >
                      Start timed mock
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
