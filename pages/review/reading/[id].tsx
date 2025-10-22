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

const loadPaper = async (id: string): Promise<ReadingPaper> => {
  try { const mod = await import(`@/data/reading/${id}.json`); return mod.default as ReadingPaper; } catch {
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

  useEffect(() => { if (!id) return; (async () => setPaper(await loadPaper(id)))(); }, [id]);
  useEffect(() => {
    if (!attempt) return;
    let cancelled = false;
    (async () => {
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

  const toggleExplanation = useCallback((questionId: string) => {
    setExpanded((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  }, []);

  if (!paper || !att) {
    return (
      <Shell title="Review — Loading…">
        <div className="rounded-2xl border border-border p-4">Loading…</div>
      </Shell>
    );
  }

  const submittedAt = att.submittedAt ? new Date(att.submittedAt) : null;
  const percentLabel = meta ? Math.round(meta.xpPercent * 100) : 0;
  const totalLabel = meta
    ? meta.xpRequired > 0
      ? `${Math.round(meta.xpTotal)}/${meta.xpRequired}`
      : `${Math.round(meta.xpTotal)}`
    : null;

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
                +{meta.xpAwarded} XP from this mock
              </h2>
              <p className="text-small text-muted-foreground">
                Total {totalLabel} XP • {percentLabel}% complete
                {meta.streak > 0 ? ` • Streak ${meta.streak} day${meta.streak === 1 ? '' : 's'}` : ''}
              </p>
            </div>
            <div className="w-full lg:max-w-sm">
              <ProgressBar value={percentLabel} ariaLabel="Band progress" />
              <p className="mt-2 text-caption text-muted-foreground">
                {submittedAt
                  ? `Submitted ${submittedAt.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                  : 'Submission time unavailable'}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-border p-4">
        <h2 className="mb-2 text-body font-semibold">Performance by question type</h2>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {statsByType.map((s) => (
            <div key={s.type} className="rounded-lg border border-border p-3 text-small">
              <div className="font-medium">{labelType(s.type)}</div>
              <div className="text-foreground/80">{s.correct}/{s.total} correct • {s.pct}%</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border p-4">
        <h2 className="mb-2 text-body font-semibold">Answers & explanations</h2>
        <div className="grid gap-3">
          {flatQs.map((q, idx) => {
            const given = (att.answers?.[q.id] ?? '').trim();
            const ok = given.toLowerCase() === (q.answer ?? '').trim().toLowerCase();
            const panelId = `reading-explanation-${q.id}`;
            const isExpanded = Boolean(expanded[q.id]);
            return (
              <div key={q.id} className="rounded-lg border border-border p-3">
                <div className="mb-1 text-small text-foreground/80">Q{idx + 1}. {q.prompt || q.id}</div>
                <div className="text-small">
                  <span className={`rounded px-2 py-0.5 text-background ${ok ? 'bg-primary' : 'bg-border'}`}>{ok ? 'Correct' : 'Wrong'}</span>
                  <span className="ml-3">Your answer: <strong>{given || '—'}</strong></span>
                  {!ok && <span className="ml-3">Correct: <strong>{q.answer}</strong></span>}
                </div>
                {q.explanation ? (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => toggleExplanation(q.id)}
                      aria-expanded={isExpanded}
                      aria-controls={panelId}
                      className="flex items-center gap-2 text-small font-medium text-primary hover:text-primary/80"
                    >
                      <span>{isExpanded ? 'Hide AI explanation' : 'Show AI explanation'}</span>
                      <span
                        className={`inline-block text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        aria-hidden
                      >
                        ▾
                      </span>
                    </button>
                    {isExpanded ? (
                      <div
                        id={panelId}
                        className="mt-2 rounded-lg border border-dashed border-border/70 bg-foreground/5 p-3 text-small text-foreground/80"
                      >
                        <p className="whitespace-pre-wrap leading-6">{q.explanation}</p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex items-center justify-between">
        <Link href="/reading" className="text-small underline underline-offset-4">Try another reading</Link>
        <Link href="/dashboard" className="rounded-xl border border-border px-4 py-2 hover:border-primary">Go to dashboard</Link>
      </div>
    </Shell>
  );
}
const labelType = (t: string) => t === 'tfng' ? 'True/False/Not Given' : t === 'yynn' ? 'Yes/No/Not Given' : t === 'heading' ? 'Headings' : t === 'match' ? 'Matching' : t === 'mcq' ? 'Multiple Choice' : 'Gap Fill';
