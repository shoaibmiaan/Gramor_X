import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import {
  clearMockAttemptId,
  clearMockDraft,
  ensureMockAttemptId,
  fetchMockCheckpoint,
  loadMockDraft,
  saveMockCheckpoint,
  saveMockDraft,
} from '@/lib/mock/state';
import { useDebouncedCallback } from 'use-debounce';

type QType = 'tfng' | 'yynn' | 'heading' | 'match' | 'mcq' | 'gap';
type Q = { id: string; type: QType; prompt?: string; options?: string[]; answer: string };
type Passage = { id: string; title: string; text: string; questions: Q[] };
type ReadingPaper = { id: string; title: string; durationSec: number; passages: Passage[] };

type AnswerMap = Record<string, string>;
type DraftState = { answers: AnswerMap; passageIdx: number; timeLeft?: number };

const sampleReading: ReadingPaper = {
  id: 'sample-001',
  title: 'Reading Sample 001',
  durationSec: 3600,
  passages: [
    { id: 'P1', title: 'The Honeybee', text: 'Bees are fascinating…', questions: [
      { id: 'q1', type: 'tfng', prompt: 'Bees can see UV light.', answer: 'True' },
      { id: 'q2', type: 'yynn', prompt: 'Honey is spicy.', answer: 'No' },
      { id: 'q3', type: 'heading', prompt: 'Choose paragraph heading', options: ['Origins','Vision','Diet'], answer: 'Vision' },
    ]},
    { id: 'P2', title: 'Ancient Roads', text: 'Roads enabled trade…', questions: [
      { id: 'q4', type: 'match', prompt: 'Match A with B', options: ['Roman','Silk','Inca'], answer: 'Roman' },
      { id: 'q5', type: 'mcq', prompt: 'Pick one', options: ['A','B','C'], answer: 'C' },
    ]},
  ],
};

const loadPaper = async (id: string): Promise<ReadingPaper> => {
  try { const mod = await import(`@/data/reading/${id}.json`); return mod.default as ReadingPaper; } catch { return sampleReading; }
};

const Shell: React.FC<{
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  mainClassName?: string;
}> = ({ title, right, children, mainClassName }) => (
  <div className="min-h-screen bg-background text-foreground">
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-background focus:px-3 focus:py-2"
    >
      Skip to main content
    </a>
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-4" role="banner">
        <h1 className="text-h3 font-semibold" id="page-heading">
          {title}
        </h1>
        <div aria-live="polite" className="flex flex-wrap items-center gap-3">
          {right}
        </div>
      </header>
      <main
        id="main-content"
        aria-labelledby="page-heading"
        className={mainClassName || 'grid gap-6'}
      >
        {children}
      </main>
    </div>
  </div>
);

export default function ReadingMockPage() {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const [paper, setPaper] = useState<ReadingPaper | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [passageIdx, setPassageIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(3600);
  const attemptRef = useRef<string>('');
  const [attemptReady, setAttemptReady] = useState(false);
  const [checkpointHydrated, setCheckpointHydrated] = useState(false);
  const latestRef = useRef<{ answers: AnswerMap; passageIdx: number; timeLeft: number }>({ answers: {}, passageIdx: 0, timeLeft: 0 });
  const passageHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const initialPassageFocus = useRef(true);
  const [timerAnnouncement, setTimerAnnouncement] = useState('');

  useEffect(() => {
    if (!id) return;
    const attempt = ensureMockAttemptId('reading', id);
    attemptRef.current = attempt;
    setAttemptReady(true);
  }, [id]);

  useEffect(() => {
    void router.prefetch('/mock/reading/review/demo-attempt');
  }, [router]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const p = await loadPaper(id);
      setPaper(p);
      const draft = loadMockDraft<DraftState>('reading', id);
      if (draft?.data) {
        if (draft.data.answers) setAnswers(draft.data.answers);
        if (typeof draft.data.passageIdx === 'number') setPassageIdx(draft.data.passageIdx);
        if (typeof draft.data.timeLeft === 'number') {
          setTimeLeft(Math.max(0, Math.min(p.durationSec, Math.round(draft.data.timeLeft))));
        } else {
          setTimeLeft(p.durationSec);
        }
      } else {
        setTimeLeft(p.durationSec);
        saveMockDraft('reading', id, { answers: {}, passageIdx: 0, timeLeft: p.durationSec });
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!paper || !attemptReady) return;
    let cancelled = false;

    (async () => {
      const checkpoint = await fetchMockCheckpoint({ attemptId: attemptRef.current, section: 'reading' });
      if (cancelled) return;
      if (checkpoint && checkpoint.mockId === paper.id) {
        const payload = (checkpoint.payload || {}) as {
          answers?: AnswerMap;
          passageIdx?: number;
          timeLeft?: number;
        };
        if (payload.answers) setAnswers(payload.answers);
        if (typeof payload.passageIdx === 'number') setPassageIdx(payload.passageIdx);
        if (typeof payload.timeLeft === 'number') {
          setTimeLeft(Math.max(0, Math.min(paper.durationSec, Math.round(payload.timeLeft))));
        } else {
          const duration = typeof checkpoint.duration === 'number' ? checkpoint.duration : paper.durationSec;
          const remaining = Math.max(0, duration - checkpoint.elapsed);
          setTimeLeft(Math.max(0, Math.min(paper.durationSec, remaining)));
        }
      }
      setCheckpointHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [paper, attemptReady]);

  useEffect(() => {
    if (!paper) return;
    const t = setInterval(() => setTimeLeft((x) => (x > 0 ? x - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [paper]);

  useEffect(() => {
    if (!paper || !checkpointHydrated) return;
    if (initialPassageFocus.current) {
      initialPassageFocus.current = false;
      return;
    }
    passageHeadingRef.current?.focus();
  }, [paper, passageIdx, checkpointHydrated]);

  useEffect(() => {
    if (!paper) return;
    const shouldAnnounce =
      timeLeft === paper.durationSec ||
      timeLeft === 0 ||
      timeLeft % 60 === 0 ||
      (timeLeft <= 60 && (timeLeft <= 10 || timeLeft % 15 === 0));
    if (shouldAnnounce) {
      setTimerAnnouncement(`Time remaining: ${formatTimeForAnnouncement(timeLeft)}`);
    }
  }, [paper, timeLeft]);

  const debouncedLocalDraft = useDebouncedCallback(
    (payload: DraftState) => {
      if (!id) return;
      saveMockDraft('reading', id, payload);
    },
    500,
    { maxWait: 3000 }
  );

  useEffect(() => {
    latestRef.current = { answers, passageIdx, timeLeft };
  }, [answers, passageIdx, timeLeft]);

  useEffect(() => {
    if (!id) return;
    debouncedLocalDraft({ answers, passageIdx, timeLeft });
    return () => {
      debouncedLocalDraft.flush();
    };
  }, [id, answers, passageIdx, timeLeft, debouncedLocalDraft]);

  const persistCheckpoint = useCallback(
    (opts?: { completed?: boolean }) => {
      if (!paper || !attemptReady || !checkpointHydrated || !attemptRef.current) return;
      const state = latestRef.current;
      const elapsed = Math.max(0, Math.min(paper.durationSec, paper.durationSec - state.timeLeft));
      void saveMockCheckpoint({
        attemptId: attemptRef.current,
        section: 'reading',
        mockId: paper.id,
        payload: {
          paperId: paper.id,
          answers: state.answers,
          passageIdx: state.passageIdx,
          timeLeft: state.timeLeft,
        },
        elapsed,
        duration: paper.durationSec,
        completed: opts?.completed,
      });
    },
    [paper, attemptReady, checkpointHydrated]
  );

  useEffect(() => {
    if (!paper || !attemptReady || !checkpointHydrated) return;
    const handler = () => {
      debouncedLocalDraft.flush();
      persistCheckpoint();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [paper, attemptReady, checkpointHydrated, persistCheckpoint, debouncedLocalDraft]);

  useEffect(() => {
    if (!paper || !attemptReady || !checkpointHydrated) return;
    const handle = setTimeout(() => persistCheckpoint(), 1000);
    return () => clearTimeout(handle);
  }, [answers, passageIdx, paper, attemptReady, checkpointHydrated, persistCheckpoint]);

  useEffect(() => {
    if (!paper || !attemptReady || !checkpointHydrated) return;
    const interval = setInterval(() => persistCheckpoint(), 15000);
    return () => clearInterval(interval);
  }, [paper, attemptReady, checkpointHydrated, persistCheckpoint]);

  const current = paper?.passages[passageIdx];

  const submit = async () => {
    if (!paper || !id) return;
    const flatQ = paper.passages.flatMap((p) => p.questions);
    let correct = 0;
    for (const q of flatQ) if (normalize(answers[q.id] || '') === normalize(q.answer)) correct++;
    const percentage = Math.round((correct / flatQ.length) * 100);
    let attemptId = '';
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user?.id) throw new Error('Not authenticated');
      const payload = { user_id: u.user.id, paper_id: paper.id, answers, score: correct, total: flatQ.length, percentage, submitted_at: new Date().toISOString(), duration_sec: paper.durationSec - timeLeft };
      const { data, error } = await supabase.from('attempts_reading').insert(payload).select('id').single();
      if (error) throw error;
      attemptId = data.id as unknown as string;
    } catch {
      attemptId = `local-${Date.now()}`;
      try { localStorage.setItem(`read:attempt-res:${attemptId}`, JSON.stringify({ paper, answers })); } catch {}
    } finally {
      if (attemptRef.current) {
        void saveMockCheckpoint({
          attemptId: attemptRef.current,
          section: 'reading',
          mockId: paper.id,
          payload: { paperId: paper.id, answers, passageIdx, timeLeft },
          elapsed: paper.durationSec - timeLeft,
          duration: paper.durationSec,
          completed: true,
        });
        clearMockAttemptId('reading', paper.id);
      }
      clearMockDraft('reading', id);
      router.replace({
        pathname: '/mock/reading/review/[attemptId]',
        query: { attemptId, paperId: paper.id },
      });
    }
  };

  if (!paper || !current) return <Shell title="Loading..."><div className="rounded-2xl border border-border p-4">Loading paper…</div></Shell>;

  const palette = paper.passages.flatMap((p) => p.questions.map((q) => q.id));
  const answered = Object.keys(answers).length;
  const percent = Math.round((answered / palette.length) * 100);

  const passageHeadingId = `passage-${current.id}-title`;

  return (
    <Shell
      title={`Reading — ${paper.title}`}
      right={
        <>
          <div className="text-small text-foreground/80" role="status">
            Answered {percent}% of questions
          </div>
          <div
            className="rounded-full border border-border px-3 py-1 text-small"
            role="timer"
            aria-live="off"
            aria-atomic="true"
          >
            ⏱ {hhmmss(timeLeft)}
          </div>
          <span className="sr-only" aria-live="polite">
            {timerAnnouncement}
          </span>
        </>
      }
      mainClassName="grid gap-6 md:grid-cols-[2fr,1fr]"
    >
      {/* Left: passage + questions */}
      <section
        className="rounded-2xl border border-border bg-background/50 p-4"
        aria-labelledby={passageHeadingId}
      >
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2
            id={passageHeadingId}
            ref={passageHeadingRef}
            tabIndex={-1}
            className="text-body font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Passage {passageIdx + 1} of {paper.passages.length} — {current.title}
          </h2>
          <nav aria-label="Passage navigation" className="flex gap-2">
            <button
              type="button"
              disabled={passageIdx === 0}
              onClick={() => setPassageIdx((i) => Math.max(0, i - 1))}
              className="rounded-lg border border-border px-3 py-1 text-small transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
              aria-controls="question-list"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={passageIdx === paper.passages.length - 1}
              onClick={() => setPassageIdx((i) => Math.min(paper.passages.length - 1, i + 1))}
              className="rounded-lg border border-border px-3 py-1 text-small transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
              aria-controls="question-list"
            >
              Next
            </button>
          </nav>
        </div>
        <article className="prose prose-invert max-w-none" aria-labelledby={passageHeadingId}>
          <p className="whitespace-pre-wrap text-small leading-6 text-foreground/90">{current.text}</p>
        </article>
        <div id="question-list" className="mt-4 grid gap-3">
          {current.questions.map((q, index) => {
            const promptId = `question-${q.id}-prompt`;
            const descriptionId = `question-${q.id}-type`;
            return (
              <section key={q.id} aria-labelledby={promptId} aria-describedby={descriptionId} className="rounded-lg border border-border p-3">
                <h3 id={promptId} className="mb-1 text-small font-medium">
                  Q{index + 1}. {q.prompt || q.id}
                </h3>
                <p id={descriptionId} className="sr-only">
                  {describeQuestionType(q.type)}
                </p>
                {renderInput(
                  q,
                  answers[q.id] || '',
                  (val) => setAnswers((a) => ({ ...a, [q.id]: val })),
                  promptId,
                  descriptionId
                )}
              </section>
            );
          })}
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={submit}
            className="rounded-xl bg-primary px-4 py-2 font-medium text-background transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Submit for scoring
          </button>
        </div>
      </section>

      {/* Right: palette */}
      <aside
        className="rounded-2xl border border-border bg-background/50 p-4"
        aria-labelledby="question-palette-heading"
      >
        <div id="question-palette-heading" className="mb-2 text-small font-medium">
          Question palette
        </div>
        <ol className="grid grid-cols-5 gap-2" aria-label="Question progress">
          {palette.map((qid, idx) => {
            const isAnswered = Boolean(answers[qid]);
            return (
              <li key={qid}>
                <span
                  className={`block rounded border px-0 py-1 text-center text-caption ${isAnswered ? 'border-primary bg-primary/10' : 'border-border'}`}
                  aria-label={`Question ${idx + 1} ${isAnswered ? 'answered' : 'not answered'}`}
                >
                  {idx + 1}
                </span>
              </li>
            );
          })}
        </ol>
        <div className="mt-4">
          <Link href="/reading" prefetch className="text-small underline underline-offset-4">
            Change test
          </Link>
        </div>
      </aside>
    </Shell>
  );
}

function renderInput(
  q: Q,
  value: string,
  onChange: (v: string) => void,
  labelledBy: string,
  describedBy?: string
) {
  if (q.type === 'tfng') {
    const opts = ['True', 'False', 'Not Given'];
    return (
      <Options
        options={opts}
        value={value}
        onPick={onChange}
        name={`q-${q.id}`}
        labelledBy={labelledBy}
        describedBy={describedBy}
      />
    );
  }
  if (q.type === 'yynn') {
    const opts = ['Yes', 'No', 'Not Given'];
    return (
      <Options
        options={opts}
        value={value}
        onPick={onChange}
        name={`q-${q.id}`}
        labelledBy={labelledBy}
        describedBy={describedBy}
      />
    );
  }
  if (q.type === 'heading' || q.type === 'match' || q.type === 'mcq') {
    return (
      <Options
        options={q.options || []}
        value={value}
        onPick={onChange}
        name={`q-${q.id}`}
        labelledBy={labelledBy}
        describedBy={describedBy}
      />
    );
  }
  return (
    <input
      id={`${labelledBy}-input`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      placeholder="Type your answer"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      type="text"
    />
  );
}
const Options: React.FC<{
  options: string[];
  value: string;
  onPick: (v: string) => void;
  name: string;
  labelledBy: string;
  describedBy?: string;
}> = ({ options, value, onPick, name, labelledBy, describedBy }) => (
  <fieldset className="mt-1" aria-labelledby={labelledBy} aria-describedby={describedBy}>
    <legend className="sr-only">Select one answer</legend>
    <div className="flex flex-wrap gap-2">
      {options.map((opt, idx) => {
        const optionId = `${name}-${toOptionId(opt, idx)}`;
        const isSelected = value === opt;
        return (
          <label
            key={optionId}
            htmlFor={optionId}
            className={`inline-flex cursor-pointer items-center rounded-lg border px-3 py-1 text-small transition focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background ${
              isSelected ? 'border-primary bg-primary/10' : 'border-border hover:border-primary'
            }`}
            data-selected={isSelected || undefined}
          >
            <input
              id={optionId}
              type="radio"
              name={name}
              value={opt}
              checked={isSelected}
              onChange={() => onPick(opt)}
              className="sr-only"
            />
            <span>{opt}</span>
          </label>
        );
      })}
    </div>
  </fieldset>
);
const hhmmss = (sec: number) => `${Math.floor(sec/60).toString().padStart(2,'0')}:${Math.floor(sec%60).toString().padStart(2,'0')}`;
const formatTimeForAnnouncement = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const parts: string[] = [];
  if (mins > 0) parts.push(`${mins} minute${mins === 1 ? '' : 's'}`);
  if (secs > 0 || mins === 0) parts.push(`${secs} second${secs === 1 ? '' : 's'}`);
  return parts.join(' ');
};
const toOptionId = (value: string, index: number) => {
  const base = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return base || `option-${index}`;
};
const describeQuestionType = (type: QType) => {
  switch (type) {
    case 'tfng':
      return 'True, False, or Not Given question';
    case 'yynn':
      return 'Yes, No, or Not Given question';
    case 'heading':
      return 'Heading matching question';
    case 'match':
      return 'Matching question';
    case 'mcq':
      return 'Multiple choice question';
    default:
      return 'Short answer question';
  }
};
const normalize = (s: string) => s.trim().toLowerCase();
