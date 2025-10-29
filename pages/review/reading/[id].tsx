import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { readingBandFromRaw } from '@/lib/reading/band';
import { ProgressBar } from '@/components/design-system/ProgressBar';
import {
  computeReadingMockXp,
  resolveTargetBand,
  xpProgressPercent,
  xpRequiredForBand,
} from '@/lib/mock/xp';
import type { MockReadingResultResponse } from '@/types/api/mock';

type QType = 'tfng' | 'yynn' | 'heading' | 'match' | 'mcq' | 'gap';
type Q = { id: string; type: QType; prompt?: string; options?: string[]; answer: string; explanation?: string };
type Passage = { id: string; title: string; text: string; questions: Q[] };
type ReadingPaper = { id: string; title: string; passages: Passage[] };

type Attempt = {
  id: string;
  answers: Record<string, string>;
  correct: number;
  total: number;
  percentage: number;
  submittedAt: string | null;
  band: number;
  durationSec: number;
};

type ResultMeta = {
  xpAwarded: number;
  xpTotal: number;
  xpRequired: number;
  xpPercent: number;
  targetBand: number;
  streak: number;
};

const isLocalAttemptId = (value: string) => value.startsWith('local-');

const loadPaper = async (id: string): Promise<ReadingPaper> => {
  try {
    const mod = await import(`@/data/reading/${id}.json`);
    return mod.default as ReadingPaper;
  } catch {
    return {
      id: 'sample-001',
      title: 'Reading Sample 001',
      passages: [
        { id: 'P1', title: 'The Honeybee', text: 'Bees are fascinating…', questions: [
          { id: 'q1', type: 'tfng', prompt: 'Bees can see UV light.', answer: 'True', explanation: 'Bees have UV vision.' },
          { id: 'q2', type: 'yynn', prompt: 'Honey is spicy.', answer: 'No', explanation: 'Honey is sweet.' },
          { id: 'q3', type: 'heading', prompt: 'Choose paragraph heading', options: ['Origins','Vision','Diet'], answer: 'Vision', explanation: 'The paragraph describes visual capability.' },
        ]},
        { id: 'P2', title: 'Ancient Roads', text: 'Roads enabled trade…', questions: [
          { id: 'q4', type: 'match', prompt: 'Match A with B', options: ['Roman','Silk','Inca'], answer: 'Roman', explanation: 'Describes Roman roads.' },
          { id: 'q5', type: 'mcq', prompt: 'Pick one', options: ['A','B','C'], answer: 'C', explanation: 'Option C aligns with text.' },
        ]},
      ],
    };
  }
};

const Shell: React.FC<{ title: string; right?: React.ReactNode; children: React.ReactNode }> = ({ title, right, children }) => (
  <div className="min-h-screen bg-background text-foreground">
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-h3 font-semibold">{title}</h1>
        <div className="flex items-center gap-3">{right}</div>
      </header>
      <div className="grid gap-6">{children}</div>
    </div>
  </div>
);

export default function ReadingReviewPage() {
  const router = useRouter();
  const { id, attempt } = router.query as { id?: string; attempt?: string };
  const [paper, setPaper] = useState<ReadingPaper | null>(null);
  const [att, setAtt] = useState<Attempt | null>(null);
  const [meta, setMeta] = useState<ResultMeta | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => { 
    if (!id) return; 
    (async () => setPaper(await loadPaper(id)))(); 
  }, [id]);

  useEffect(() => {
    if (!attempt) return;
    let cancelled = false;

    const loadFromLocal = async () => {
      try {
        const raw = localStorage.getItem(`read:attempt-res:${attempt}`);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        const answers = parsed.answers || {};
        const flat: Q[] = (parsed.paper?.passages ?? []).flatMap((p: any) => p.questions);
        const total = flat.length;
        let correct = 0;
        for (const q of flat) if ((answers[q.id] ?? '').trim().toLowerCase() === (q.answer ?? '').trim().toLowerCase()) correct++;
        const band = readingBandFromRaw(correct, Math.max(1, total));
        if (cancelled) return;
        setAtt({
          id: attempt,
          answers,
          correct,
          total,
          percentage: Math.round((correct / Math.max(1, total)) * 100),
          submittedAt: new Date().toISOString(),
          band,
          durationSec: 0,
        });
        const xpInfo = computeReadingMockXp(correct, Math.max(1, total), 0);
        const targetBand = resolveTargetBand(band);
        const required = xpRequiredForBand(targetBand);
        const percent = xpProgressPercent(xpInfo.xp, required);
        setMeta({
          xpAwarded: xpInfo.xp,
          xpTotal: xpInfo.xp,
          xpRequired: required,
          xpPercent: percent,
          targetBand,
          streak: 0,
        });
      } catch (error) {
        console.warn('[review/reading] local fallback failed', error);
      }
    };

    (async () => {
      if (isLocalAttemptId(attempt)) {
        await loadFromLocal();
        return;
      }

      try {
        const res = await fetch(`/api/mock/reading/result?attemptId=${encodeURIComponent(attempt)}`);
        if (!res.ok) throw new Error('Failed to load attempt');
        const json = (await res.json()) as MockReadingResultResponse;
        if (!json.ok) throw new Error(json.error || 'Failed to load attempt');
        if (cancelled) return;
        const attemptData = json.attempt;
        setAtt({
          id: attemptData.id,
          answers: attemptData.answers ?? {},
          correct: attemptData.correct,
          total: attemptData.total,
          percentage: attemptData.percentage,
          submittedAt: attemptData.submittedAt ?? null,
          band: attemptData.band,
          durationSec: attemptData.durationSec,
        });
        setMeta({
          xpAwarded: json.xp.awarded,
          xpTotal: json.xp.total,
          xpRequired: json.xp.required,
          xpPercent: json.xp.percent,
          targetBand: json.xp.targetBand,
          streak: json.streak?.current ?? 0,
        });
        return;
      } catch (error) {
        console.warn('[review/reading] attempt fetch failed', error);
      }

      await loadFromLocal();
    })();

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const flatQs = useMemo(() => paper?.passages.flatMap((p) => p.questions) ?? [], [paper]);

  const statsByType = useMemo(() => {
    if (!paper || !att) return [];
    const map: Record<string, { correct: number; total: number }> = {};
    for (const q of flatQs) {
      const key = q.type;
      map[key] ??= { correct: 0, total: 0 };
      map[key].total++;
      const ok = (att.answers?.[q.id] ?? '').trim().toLowerCase() === (q.answer ?? '').trim().toLowerCase();
      if (ok) map[key].correct++;
    }
    return Object.entries(map).map(([type, { correct, total }]) => ({ type, correct, total, pct: Math.round((correct / total) * 100) }));
  }, [paper, att, flatQs]);

  const toggleExplanation = useCallback((qid: string) => {
    setExpanded((prev) => ({ ...prev, [qid]: !prev[qid] }));
  }, []);

  const totalLabel = meta?.xpTotal ?? 0;
  const percentLabel = meta?.xpPercent ?? 0;
  const submittedAt = att?.submittedAt ? new Date(att.submittedAt) : null;

  if (!paper || !att) return <Shell title="Review — Loading…"><div className="rounded-2xl border border-border p-4">Loading…</div></Shell>;

  return (
    <Shell
      title={`Review — ${paper.title}`}
      right={(
        <div className="rounded-full border border-border px-3 py-1 text-small">
          Band {att.band.toFixed(1)} • {att.correct}/{att.total} ({att.percentage}%)
        </div>
      )}
    >
      {meta ? (
        <section className="rounded-2xl border border-border bg-background/60 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-caption uppercase tracking-wide text-muted-foreground">
                Toward Band {meta.targetBand.toFixed(1)}
              </p>
              <h2 className="text-h4 font-semibold text-foreground">
                +{meta.xpAwarded} XP earned
              </h2>
              <p className="text-small text-muted-foreground">
                {totalLabel} XP total • {percentLabel}% to Band {meta.targetBand.toFixed(1)}
              </p>
            </div>
            <div className="w-full max-w-md">
              <ProgressBar value={meta.xpPercent} label={`${percentLabel}%`} />
            </div>
          </div>
          {meta.streak > 1 ? (
            <p className="mt-3 text-small text-foreground/80">
              🔥 {meta.streak}-test streak! Keep practicing to boost your band.
            </p>
          ) : null}
        </section>
      ) : null}
      <section className="rounded-2xl border border-border bg-background/60 p-4">
        <h2 className="text-h4 font-semibold">Performance by question type</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {statsByType.map(({ type, correct, total, pct }) => (
            <div key={type} className="rounded-lg border border-border bg-background/80 p-3">
              <p className="text-small font-medium capitalize">{type}</p>
              <p className="text-caption text-muted-foreground">
                {correct}/{total} correct ({pct}%)
              </p>
            </div>
          ))}
        </div>
      </section>
      <section className="space-y-4">
        <h2 className="text-h4 font-semibold">Your answers</h2>
        {paper.passages.map((passage) => (
          <div key={passage.id} className="rounded-2xl border border-border bg-background/60 p-4">
            <h3 className="text-h5 font-semibold">{passage.title}</h3>
            <div className="mt-3 space-y-3">
              {passage.questions.map((q, idx) => {
                const userAnswer = att.answers[q.id] ?? '';
                const isCorrect = userAnswer.trim().toLowerCase() === q.answer.trim().toLowerCase();
                const showExplanation = expanded[q.id];
                return (
                  <div
                    key={q.id}
                    className={`rounded-lg border p-3 ${isCorrect ? 'border-success/60 bg-success/10' : 'border-danger/60 bg-danger/10'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
                          Question {idx + 1}
                        </p>
                        <p className="text-small font-medium">{q.prompt || q.id}</p>
                      </div>
                      <div className="text-caption font-medium">
                        {isCorrect ? '✅ Correct' : '❌ Incorrect'}
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-small">
                      <span className="text-muted-foreground">Your answer:</span>
                      <span>{userAnswer || '—'}</span>
                      <span className="text-muted-foreground">Correct answer:</span>
                      <span>{q.answer}</span>
                    </div>
                    {q.explanation ? (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => toggleExplanation(q.id)}
                          className="text-small text-primary underline underline-offset-4 hover:text-primary/80"
                        >
                          {showExplanation ? 'Hide explanation' : 'Show explanation'}
                        </button>
                        {showExplanation ? (
                          <p className="mt-2 text-small text-foreground/80">{q.explanation}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>
      <section className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-small text-muted-foreground">
          {submittedAt ? `Submitted ${submittedAt.toLocaleString()}` : 'Completed recently'}
        </p>
        <div className="flex gap-3">
          <Link
            href={`/mock/reading/${id}`}
            className="rounded-full border border-border px-4 py-2 text-small text-foreground hover:bg-background/80"
          >
            Retake test
          </Link>
          <Link
            href="/reading"
            className="rounded-full bg-primary px-4 py-2 text-small font-semibold text-background hover:opacity-90"
          >
            Try another test
          </Link>
        </div>
      </section>
    </Shell>
  );
}