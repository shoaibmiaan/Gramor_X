import React from 'react';
import clsx from 'clsx';
import type { GetServerSideProps, NextPage } from 'next';
import { CheckCircle2, XCircle } from 'lucide-react';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Alert } from '@/components/design-system/Alert';
import { Button } from '@/components/design-system/Button';
import { getAttempt } from '@/pages/api/reading/submit';

type BreakdownEntry = { correct: number; total: number; pct: number };

type ReviewQuestion = {
  id: string;
  qNo: number;
  type: string;
  prompt: string;
  sectionTitle?: string | null;
  user: any;
  correct: any;
  acceptable?: string[] | null;
  options?: string[] | null;
  pairs?: { left: string; right: string | string[] }[] | null;
  isCorrect: boolean;
  rationale?: string | null;
};

type ReviewSummary = {
  band: number;
  correctCount: number;
  total: number;
  breakdown: Record<string, BreakdownEntry>;
  createdAt?: string | null;
  userId?: string | null;
};

type ReviewPageProps = {
  notFound?: boolean;
  error?: string | null;
  attemptId?: string;
  slug?: string;
  title?: string;
  passage?: string;
  summary?: ReviewSummary;
  questions?: ReviewQuestion[];
};

type AIExplanation = {
  id?: string;
  correct: string;
  user: string;
  isCorrect: boolean;
  explanation: string;
  tip: string;
};

export const getServerSideProps: GetServerSideProps<ReviewPageProps> = async (ctx) => {
  const slug = ctx.params?.slug ? String(ctx.params.slug) : '';
  const attemptId = (ctx.query.attemptId as string) ?? (ctx.query.attempt as string) ?? null;

  if (!slug) {
    return { notFound: true };
  }

  if (!attemptId) {
    return {
      props: {
        notFound: true,
        error: 'Missing attempt identifier.',
      },
    };
  }

  let answers: Record<string, any> | null = null;
  let paper: any = null;
  let title: string | null = null;
  let fetchError: string | null = null;

  const attempt = getAttempt(attemptId);
  if (attempt && attempt.slug === slug) {
    answers = attempt.answers ?? null;
    paper = attempt.paper ?? null;
    title = attempt.paperTitle ?? attempt.paper?.title ?? null;
  }

  if (!paper) {
    const protocol = (ctx.req?.headers['x-forwarded-proto'] as string) ?? 'http';
    const host = ctx.req?.headers.host;
    if (host) {
      try {
        const baseUrl = `${protocol}://${host}`;
        const resp = await fetch(`${baseUrl}/api/reading/test/${encodeURIComponent(slug)}?answers=1`);
        if (resp.ok) {
          const json = await resp.json();
          paper = json;
          if (!title) title = json.title ?? null;
        }
      } catch (err: any) {
        fetchError = err?.message ?? 'Unable to load reading passage.';
      }
    }
  }

  if (!answers && attempt?.result?.items) {
    const derived: Record<string, any> = {};
    for (const item of attempt.result.items) {
      derived[item.id] = item.user;
    }
    answers = derived;
  }

  const attemptItemMap = new Map<string, any>();
  if (attempt?.result?.items) {
    for (const item of attempt.result.items) {
      attemptItemMap.set(String(item.id), item);
    }
  }

  if (!answers || !paper) {
    return {
      props: {
        notFound: true,
        error: fetchError ?? 'Attempt not found or has expired.',
      },
    };
  }

  const answerSheet = answers as Record<string, any>;

  const sections = Array.isArray(paper.sections)
    ? paper.sections
    : paper.questions
      ? [{ orderNo: 1, title: paper.title ?? null, questions: paper.questions }]
      : [];

  if (!sections.length) {
    return {
      props: {
        notFound: true,
        error: 'No questions were available for this passage.',
      },
    };
  }

  const breakdown: Record<string, { correct: number; total: number; pct: number }> = {};
  const questions: ReviewQuestion[] = [];
  let correctCount = 0;
  let total = 0;

  sections.forEach((section: any, sectionIdx: number) => {
    const questionArray = Array.isArray(section.questions) ? section.questions : [];
    questionArray.forEach((raw: any, qIndex: number) => {
      const id = raw.id ?? raw.question_id ?? `${sectionIdx}-${qIndex}`;
      const qNo = raw.qNo ?? raw.q_no ?? raw.order_no ?? raw.orderNo ?? qIndex + 1;
      const type = normaliseType(raw.type ?? raw.kind ?? '');
      const sectionTitle = section.title ?? `Section ${section.orderNo ?? sectionIdx + 1}`;
      const options = extractOptions(raw.options);
      const pairs = extractPairs(raw.pairs ?? raw.options?.pairs);
      const acceptable = Array.isArray(raw.acceptable)
        ? raw.acceptable
        : Array.isArray(raw.answers) && type === 'short'
          ? raw.answers
          : null;
      const correctValue = raw.correct ?? raw.answer ?? raw.answers ?? null;
      const userAnswer =
        answerSheet[id] ??
        answerSheet[String(id)] ??
        answerSheet[String(qNo)] ??
        null;
      const questionPoints =
        typeof raw.points === 'number' && !Number.isNaN(raw.points) ? raw.points : 1;

      const isCorrect = computeCorrect(type, correctValue, acceptable, userAnswer, pairs);

      total += questionPoints;
      const bucketKey = type;
      const bucket = breakdown[bucketKey] ?? { correct: 0, total: 0, pct: 0 };
      bucket.total += questionPoints;
      if (isCorrect) {
        correctCount += questionPoints;
        bucket.correct += questionPoints;
      }
      breakdown[bucketKey] = bucket;

      const attemptMeta = attemptItemMap.get(String(id));
      const rationale = extractRationale(raw, attemptMeta);
      questions.push({
        id,
        qNo,
        type,
        prompt: raw.prompt ?? '',
        sectionTitle,
        user: userAnswer,
        correct: correctValue,
        acceptable: acceptable ?? null,
        options,
        pairs,
        isCorrect,
        rationale,
      });
    });
  });

  const summaryBreakdown = Object.fromEntries(
    Object.entries(breakdown).map(([key, value]) => [
      key,
      {
        correct: value.correct,
        total: value.total,
        pct: value.total ? Math.round((value.correct / value.total) * 100) : 0,
      },
    ]),
  );

  const band = total
    ? Math.round(((4 + (correctCount / total) * 5) + Number.EPSILON) * 10) / 10
    : 0;

  return {
    props: {
      attemptId,
      slug,
      title: title ?? paper.title ?? 'Reading Review',
      passage: paper.passage ?? paper.content ?? '',
      summary: {
        band,
        correctCount,
        total,
        breakdown: summaryBreakdown,
        createdAt: null,
        userId: null,
      },
      questions,
      error: fetchError ?? null,
    },
  };
};

const ReadingReviewPage: NextPage<ReviewPageProps> = ({
  notFound,
  error,
  attemptId,
  slug,
  title,
  passage,
  summary,
  questions,
}) => {
  if (notFound || !questions || !summary) {
    return (
      <section className="py-24">
        <Container>
          <Card className="p-6">
            <h1 className="text-h3 font-semibold mb-2">Review unavailable</h1>
            <p className="text-body text-muted-foreground">
              {error ?? 'We could not find that attempt. It may have expired or been removed.'}
            </p>
          </Card>
        </Container>
      </section>
    );
  }

  const accuracy = summary.total ? Math.round((summary.correctCount / summary.total) * 100) : null;

  const [aiState, setAiState] = React.useState<{
    loading: boolean;
    data: Record<string, AIExplanation> | null;
    error: string | null;
  }>({ loading: false, data: null, error: null });

  const stringifyAnswer = React.useCallback((value: any): string => {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.map((item) => stringifyAnswer(item)).join(', ');
    if (typeof value === 'object') {
      return Object.entries(value)
        .map(([key, val]) => `${key}: ${stringifyAnswer(val)}`)
        .join('; ');
    }
    return String(value);
  }, []);

  const requestAI = React.useCallback(async () => {
    if (!questions?.length) return;

    setAiState((prev) => ({ loading: true, data: prev.data, error: null }));

    try {
      const items = questions.map((q) => ({
        id: q.id,
        prompt: q.prompt,
        options: Array.isArray(q.options) ? q.options : undefined,
        answer: stringifyAnswer(q.correct ?? q.acceptable ?? ''),
        userAnswer: stringifyAnswer(q.user),
        passage,
      }));

      const resp = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: 'reading', items }),
      });

      const json = await resp.json();
      if (!resp.ok || !json?.ok) {
        throw new Error(json?.error || `Failed to generate feedback (${resp.status})`);
      }

      const map: Record<string, AIExplanation> = {};
      (json.explanations as AIExplanation[]).forEach((exp, idx) => {
        const fallback = questions[idx]?.id ?? `q-${idx}`;
        const key = exp.id || fallback;
        map[key] = { ...exp, id: key };
      });

      setAiState({ loading: false, data: map, error: null });
    } catch (aiErr: any) {
      setAiState({ loading: false, data: null, error: aiErr?.message ?? 'Unable to generate AI feedback.' });
    }
  }, [passage, questions, stringifyAnswer]);

  return (
    <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
      <Container>
        <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-small uppercase tracking-wide text-muted-foreground">Reading review</p>
            <h1 className="font-slab text-display text-balance mt-1">{title}</h1>
            {attemptId && (
              <p className="text-small text-muted-foreground mt-1">Attempt ID: {attemptId}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="success">Band {summary.band.toFixed(1)}</Badge>
            <Badge variant="info">
              {summary.correctCount}/{summary.total} correct
            </Badge>
            {accuracy != null && <Badge variant="neutral">{accuracy}% accuracy</Badge>}
          </div>
        </header>

        {error && (
          <Alert variant="warning" title="Additional context" className="mb-6">
            {error}
          </Alert>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {Object.entries(summary.breakdown).map(([type, data]) => (
            <Card key={type} className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-small font-semibold uppercase tracking-wide text-muted-foreground">
                  {typeLabel(type)}
                </span>
                <Badge variant={data.pct >= 70 ? 'success' : data.pct >= 40 ? 'warning' : 'danger'} size="sm">
                  {data.pct}%
                </Badge>
              </div>
              <p className="text-body">{data.correct}/{data.total} correct</p>
            </Card>
          ))}
        </div>

        <div className="mb-8 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="primary"
            className="rounded-ds-xl"
            onClick={requestAI}
            disabled={aiState.loading}
          >
            {aiState.data ? 'Refresh AI feedback' : 'Generate AI feedback'}
          </Button>
          {aiState.loading && <span className="text-small text-muted-foreground">Generating smart tips…</span>}
          {aiState.error && <span className="text-small text-sunsetOrange">{aiState.error}</span>}
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.6fr)]">
          <Card className="p-6 lg:sticky lg:top-28 h-fit">
            <h2 className="text-h3 font-semibold mb-3">Passage</h2>
            <div className="max-h-[32rem] overflow-y-auto pr-2">
              {renderPassage(passage)}
            </div>
            <div className="mt-6 space-y-2 text-small text-muted-foreground">
              <p>This view is available to students and teachers after submission.</p>
              {summary.userId && <p>Submitted by: {summary.userId}</p>}
            </div>
          </Card>

          <div className="space-y-6">
            {questions.map((q) => {
              const Icon = q.isCorrect ? CheckCircle2 : XCircle;
              const ai = aiState.data?.[q.id];
              return (
                <Card
                  key={q.id}
                  className={clsx(
                    'p-6 transition-colors',
                    q.isCorrect
                      ? 'border-success/60 bg-success/5'
                      : 'border-sunsetOrange/60 bg-sunsetOrange/10 dark:bg-sunsetOrange/20',
                  )}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-small text-muted-foreground">
                        <span>Q{q.qNo}</span>
                        {q.sectionTitle && <span>• {q.sectionTitle}</span>}
                        <Badge variant="neutral" size="sm">{typeLabel(q.type)}</Badge>
                      </div>
                      <p className="mt-2 text-body font-medium text-pretty">{q.prompt}</p>
                      {q.options && q.options.length > 0 && (
                        <ul className="mt-3 list-disc pl-5 text-small text-muted-foreground">
                          {q.options.map((opt, idx) => (
                            <li key={`${q.id}:opt:${idx}`}>{opt}</li>
                          ))}
                        </ul>
                      )}
                      {q.pairs && q.pairs.length > 0 && (
                        <div className="mt-3 space-y-1 text-small text-muted-foreground">
                          {q.pairs.map((pair, idx) => (
                            <div key={`${q.id}:pair:${idx}`} className="flex gap-2">
                              <span className="font-medium">{pair.left}</span>
                              <span className="opacity-80">→ {Array.isArray(pair.right) ? pair.right.join(' / ') : pair.right ?? '—'}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="p-3 rounded-ds border border-lightBorder/70 dark:border-white/10">
                          <p className="text-small font-semibold text-muted-foreground mb-1">Your answer</p>
                          <div className={clsx('text-body', q.isCorrect ? 'text-success' : 'text-sunsetOrange')}>
                            {formatAnswer(q, q.user, false)}
                          </div>
                        </div>
                        <div className="p-3 rounded-ds border border-lightBorder/70 dark:border-white/10">
                          <p className="text-small font-semibold text-muted-foreground mb-1">Correct answer</p>
                          <div className="text-body">{formatCorrectAnswer(q)}</div>
                        </div>
                      </div>
                      {!q.isCorrect && q.rationale && (
                        <div className="mt-4 rounded-ds border border-lightBorder/70 bg-muted/20 p-4 text-body dark:border-white/10 dark:bg-white/5">
                          <p className="text-small font-semibold text-muted-foreground">Rationale</p>
                          <p className="mt-1 text-pretty">{q.rationale}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-success">
                      <Icon className={clsx('h-6 w-6', q.isCorrect ? 'text-success' : 'text-sunsetOrange')} aria-hidden="true" />
                      <span className="font-semibold text-body">
                        {q.isCorrect ? 'Correct' : 'Incorrect'}
                      </span>
                    </div>
                  </div>
                  {ai && (
                    <div className="mt-4 rounded-ds border border-primary/40 bg-primary/5 p-4">
                      <p className="text-small font-semibold text-primary">AI feedback</p>
                      <p className="mt-2 text-body text-pretty">{ai.explanation}</p>
                      <p className="mt-2 text-small text-muted-foreground">Tip: {ai.tip}</p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Button
            as="a"
            href={`/reading/passage/${encodeURIComponent(slug ?? '')}`}
            variant="primary"
            className="rounded-ds-xl px-6 py-3"
          >
            Retake passage
          </Button>
          <Button as="a" href="/reading" variant="secondary" className="rounded-ds-xl px-6 py-3">
            Back to reading list
          </Button>
        </div>
      </Container>
    </section>
  );
};

function normaliseType(type: string): 'mcq' | 'tfng' | 'ynng' | 'short' | 'matching' {
  const lower = (type ?? '').toLowerCase();
  if (lower === 'match' || lower === 'matching') return 'matching';
  if (lower === 'gap' || lower === 'short') return 'short';
  if (lower === 'ynng') return 'ynng';
  if (lower === 'tfng') return 'tfng';
  return 'mcq';
}

function normaliseText(value: any): string {
  if (value == null) return '';
  return String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{Letter}\p{Number}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function computeCorrect(
  type: 'mcq' | 'tfng' | 'ynng' | 'short' | 'matching',
  correct: any,
  acceptable: string[] | null,
  user: any,
  pairs?: { left: string; right: string | string[] }[] | null,
): boolean {
  if (user == null || user === '') return false;

  if (type === 'mcq' || type === 'tfng' || type === 'ynng') {
    const expected = Array.isArray(correct)
      ? correct[0]
      : correct ?? (acceptable && acceptable.length ? acceptable[0] : null);
    if (expected == null) return false;
    return normaliseText(user) === normaliseText(expected);
  }

  if (type === 'short') {
    const possibilities: string[] = [];
    if (Array.isArray(correct)) possibilities.push(...correct.map(String));
    else if (correct != null) possibilities.push(String(correct));
    if (Array.isArray(acceptable)) possibilities.push(...acceptable.map(String));
    if (!possibilities.length) return false;
    const userNorm = normaliseText(user);
    return possibilities.some((p) => normaliseText(p) === userNorm);
  }

  if (type === 'matching') {
    if (Array.isArray(correct)) {
      if (!Array.isArray(user) || correct.length !== user.length) return false;
      return correct.every((val, idx) => normaliseText(val) === normaliseText(user[idx]));
    }

    if (correct && typeof correct === 'object') {
      if (Array.isArray(user) && pairs && pairs.length === user.length) {
        const reconstructed: Record<string, any> = {};
        pairs.forEach((pair, idx) => {
          reconstructed[pair.left] = user[idx];
        });
        user = reconstructed;
      }

      if (!user || typeof user !== 'object') return false;
      return Object.keys(correct).every((key) => normaliseText(correct[key]) === normaliseText(user[key]));
    }

    if (Array.isArray(user) && Array.isArray(acceptable)) {
      if (acceptable.length !== user.length) return false;
      return acceptable.every((val, idx) => normaliseText(val) === normaliseText(user[idx]));
    }
  }

  return false;
}

function extractOptions(raw: any): string[] | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw as string[];
  if (Array.isArray(raw.options)) return raw.options as string[];
  if (Array.isArray(raw.choices)) return raw.choices as string[];
  return null;
}

function extractPairs(raw: any): { left: string; right: string | string[] }[] | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw as { left: string; right: string | string[] }[];
  if (Array.isArray(raw.pairs)) return raw.pairs as { left: string; right: string | string[] }[];
  return null;
}

function extractRationale(raw: any, attemptItem?: any): string | null {
  if (typeof raw?.rationale === 'string') return raw.rationale;
  if (typeof raw === 'string') return raw;
  if (typeof raw?.options?.rationale === 'string') return raw.options.rationale;
  if (typeof raw?.options?.explanation === 'string') return raw.options.explanation;
  if (typeof raw?.options?.feedback === 'string') return raw.options.feedback;
  if (attemptItem && typeof attemptItem.rationale === 'string') return attemptItem.rationale;
  const metaRationale = attemptItem?.why ?? attemptItem?.explanation ?? null;
  return typeof metaRationale === 'string' ? metaRationale : null;
}

function formatAnswer(question: ReviewQuestion, value: any, showPlaceholder = true): React.ReactNode {
  if (value == null || value === '' || (typeof value === 'object' && !Array.isArray(value) && !Object.keys(value).length)) {
    return showPlaceholder ? <span className="italic text-muted-foreground">No answer</span> : null;
  }

  if (question.type === 'matching') {
    const entries: Array<[string, any]> = Array.isArray(value)
      ? (value as any[]).map((val, idx) => [question.pairs?.[idx]?.left ?? `#${idx + 1}`, val])
      : Object.entries(value as Record<string, any>);

    return (
      <ul className="space-y-1 text-small leading-tight">
        {entries.map(([left, right], idx) => (
          <li key={`${question.id}:ans:${idx}`} className="flex gap-2">
            <span className="font-medium">{left}</span>
            <span className="opacity-80">→ {right ? String(right) : '—'}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (Array.isArray(value)) {
    return <span>{value.map((v) => String(v)).join(', ')}</span>;
  }

  if (typeof value === 'object') {
    return (
      <ul className="space-y-1 text-small leading-tight">
        {Object.entries(value).map(([key, val]) => (
          <li key={`${question.id}:obj:${key}`} className="flex gap-2">
            <span className="font-medium">{key}</span>
            <span className="opacity-80">→ {val ? String(val) : '—'}</span>
          </li>
        ))}
      </ul>
    );
  }

  return <span>{String(value)}</span>;
}

function formatCorrectAnswer(question: ReviewQuestion): React.ReactNode {
  const display = question.correct ?? (question.acceptable && question.acceptable.length ? question.acceptable : null);
  const rendered = formatAnswer(question, display);

  if (question.type === 'short' && question.acceptable && question.acceptable.length > 0) {
    const correctSet = new Set<string>();
    if (Array.isArray(question.correct)) question.correct.forEach((val: any) => correctSet.add(normaliseText(val)));
    else if (question.correct != null) correctSet.add(normaliseText(question.correct));

    const alternates = question.acceptable
      .map((val) => String(val))
      .filter((val) => !correctSet.has(normaliseText(val)));

    if (alternates.length) {
      return (
        <div className="space-y-2">
          <div>{rendered}</div>
          <p className="text-xs text-muted-foreground">Also accepted: {alternates.join(', ')}</p>
        </div>
      );
    }
  }

  return rendered;
}

function renderPassage(passage?: string) {
  if (!passage) {
    return <p className="italic text-muted-foreground">Passage unavailable.</p>;
  }

  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(passage);

  if (looksLikeHtml) {
    return (
      <div
        className="prose dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: passage }}
      />
    );
  }

  return <p className="whitespace-pre-wrap text-body leading-relaxed">{passage}</p>;
}

function typeLabel(type: string): string {
  switch (type) {
    case 'tfng':
      return 'True / False / Not Given';
    case 'ynng':
      return 'Yes / No / Not Given';
    case 'matching':
      return 'Matching';
    case 'short':
      return 'Short answer';
    case 'mcq':
    default:
      return 'Multiple choice';
  }
}

export default ReadingReviewPage;
