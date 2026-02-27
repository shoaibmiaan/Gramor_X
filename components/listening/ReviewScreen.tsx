import React, { useEffect, useMemo, useState } from 'react';

import { supabase } from '@/lib/supabaseClient';
import { Card } from '@/components/design-system/Card';
import { Alert } from '@/components/design-system/Alert';
import { EmptyState } from '@/components/design-system/EmptyState';
import { Skeleton } from '@/components/design-system/Skeleton';
import { ScoreCard } from '@/components/design-system/ScoreCard';
import AnswerReview, {
  Answer as ReviewAnswer,
  MatchPair,
  Question as ReviewQuestion,
} from '@/components/listening/AnswerReview';
import TranscriptReview from '@/components/listening/TranscriptReview';
import { isCorrect } from '@/lib/answers';

type ApiAttempt = {
  id: string;
  test_slug: string;
  score: number;
  band: number | null;
  section_scores?: Record<string, unknown> | null;
  submitted_at: string | null;
  meta?: Record<string, unknown> | null;
};

type ApiQuestion = {
  qno: number;
  type: 'mcq' | 'gap' | 'match';
  prompt?: string | null;
  options?: any;
  match_left?: string[] | null;
  match_right?: string[] | null;
  answer_key?: any;
  section_order?: number | null;
};

type ApiAnswer = {
  qno: number;
  answer: any;
  is_correct?: boolean | null;
};

type ApiSection = {
  order_no: number;
  title?: string | null;
  transcript?: string | null;
};

type ApiTest = {
  slug: string;
  title?: string | null;
} | null;

type QuestionResult = {
  qno: number;
  ok: boolean;
  unanswered: boolean;
};

type Summary = {
  total: number;
  correct: number;
  accuracy: number;
  band: number;
  rawScore: number;
};

function normalizeMcqOptions(options: any): string[] {
  if (!Array.isArray(options)) return [];
  return options.map((opt) => {
    if (typeof opt === 'string') return opt;
    if (opt && typeof opt === 'object') {
      return String(opt.label ?? opt.text ?? opt.value ?? '').trim();
    }
    return String(opt ?? '');
  });
}

function normalizePairs(pairs: any): MatchPair[] {
  if (!Array.isArray(pairs)) return [];
  return pairs
    .map((pair): MatchPair | null => {
      if (Array.isArray(pair) && pair.length >= 2) {
        return [Number(pair[0]), Number(pair[1])] as MatchPair;
      }
      if (pair && typeof pair === 'object') {
        return [Number((pair as any).left), Number((pair as any).right)] as MatchPair;
      }
      return null;
    })
    .filter((pair): pair is MatchPair => Array.isArray(pair) && pair.every((v) => !Number.isNaN(v)));
}

function normalizeAnswerValue(question: ApiQuestion | undefined, value: any): string | MatchPair[] | null {
  if (value == null) return null;

  if (question?.type === 'match') {
    if (Array.isArray(value)) return normalizePairs(value);
    if (value && typeof value === 'object') {
      if ('pairs' in value) return normalizePairs((value as any).pairs);
      if ('left' in value && 'right' in value) return normalizePairs([value]);
    }
    return normalizePairs([]);
  }

  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return String(value[0] ?? '');
  if (value && typeof value === 'object') {
    if ('value' in value) return String((value as any).value ?? '');
    if ('label' in value) return String((value as any).label ?? '');
    if ('text' in value) return String((value as any).text ?? '');
  }
  return String(value ?? '');
}

export default function ReviewScreen({ slug, attemptId }: { slug: string; attemptId?: string | null }) {
  const [attempt, setAttempt] = useState<ApiAttempt | null>(null);
  const [test, setTest] = useState<ApiTest>(null);
  const [questions, setQuestions] = useState<ApiQuestion[]>([]);
  const [answers, setAnswers] = useState<ApiAnswer[]>([]);
  const [sections, setSections] = useState<ApiSection[]>([]);
  const [sectionAssignments, setSectionAssignments] = useState<Map<number, number | null>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        let id = attemptId ?? undefined;

        if (!id) {
          const { data: latest, error: latestErr } = await supabase
            .from('listening_attempts')
            .select('id')
            .eq('test_slug', slug)
            .order('submitted_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (latestErr) throw latestErr;
          id = latest?.id ?? undefined;
        }

        if (!id) {
          if (active) {
            setAttempt(null);
            setTest(null);
            setQuestions([]);
            setAnswers([]);
            setSections([]);
            setSectionAssignments(new Map());
          }
          return;
        }

        const response = await fetch(`/api/listening/review/${id}`, { credentials: 'include' });
        if (!response.ok) {
          let detail = '';
          try {
            const parsed = await response.json();
            detail = parsed?.error;
          } catch {
            // ignore
          }
          throw new Error(detail || `Failed to load review (status ${response.status})`);
        }

        const payload = (await response.json()) as {
          attempt?: ApiAttempt;
          test?: ApiTest;
          questions?: ApiQuestion[];
          answers?: ApiAnswer[];
          sections?: ApiSection[];
        };

        if (!active) return;

        setAttempt(payload.attempt ?? null);
        setTest(payload.test ?? null);
        setQuestions(payload.questions ?? []);
        setAnswers(payload.answers ?? []);
        setSections(payload.sections ?? []);

        const assignment = new Map<number, number | null>();
        (payload.questions ?? []).forEach((q) => {
          assignment.set(q.qno, typeof q.section_order === 'number' ? q.section_order : null);
        });
        setSectionAssignments(assignment);
      } catch (err: any) {
        if (!active) return;
        setError(err?.message ?? 'Failed to load review');
        setAttempt(null);
        setTest(null);
        setQuestions([]);
        setAnswers([]);
        setSections([]);
        setSectionAssignments(new Map());
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [slug, attemptId]);

  const normalized = useMemo(() => {
    const questionMap = new Map<number, ApiQuestion>();
    questions.forEach((q) => questionMap.set(q.qno, q));

    const normalizedQuestions: ReviewQuestion[] = questions.map((q) => {
      if (q.type === 'mcq') {
        const answerKey = String(q.answer_key?.value ?? '').trim();
        return {
          qno: q.qno,
          type: 'mcq',
          prompt: q.prompt ?? undefined,
          options: normalizeMcqOptions(q.options),
          answer_key: { value: answerKey },
        } as ReviewQuestion;
      }

      if (q.type === 'gap') {
        return {
          qno: q.qno,
          type: 'gap',
          prompt: q.prompt ?? undefined,
          answer_key: { text: String(q.answer_key?.text ?? '') },
        } as ReviewQuestion;
      }

      return {
        qno: q.qno,
        type: 'match',
        prompt: q.prompt ?? undefined,
        match_left: Array.isArray(q.match_left) ? q.match_left.map(String) : [],
        match_right: Array.isArray(q.match_right) ? q.match_right.map(String) : [],
        answer_key: { pairs: normalizePairs(q.answer_key?.pairs) },
      } as ReviewQuestion;
    });

    const normalizedAnswers: Array<{ qno: number; answer: string | MatchPair[] | null }> = answers.map((ans) => {
      const q = questionMap.get(ans.qno);
      return {
        qno: ans.qno,
        answer: normalizeAnswerValue(q, ans.answer),
      };
    });

    return { questions: normalizedQuestions, answers: normalizedAnswers };
  }, [questions, answers]);

  const answerMap = useMemo(() => {
    const map = new Map<number, string | MatchPair[] | null>();
    normalized.answers.forEach((ans) => {
      map.set(ans.qno, ans.answer ?? null);
    });
    return map;
  }, [normalized.answers]);

  const questionResults: QuestionResult[] = useMemo(() => {
    return normalized.questions.map((question) => {
      const userAnswer = answerMap.get(question.qno) ?? null;
      let ok = false;

      if (question.type === 'mcq') {
        ok = isCorrect(String(userAnswer ?? ''), question.answer_key.value);
      } else if (question.type === 'gap') {
        ok = isCorrect(String(userAnswer ?? ''), question.answer_key.text);
      } else {
        const want = question.answer_key.pairs ?? [];
        const got = Array.isArray(userAnswer) ? (userAnswer as MatchPair[]) : [];
        const sort = (pairs: MatchPair[]) =>
          [...pairs].sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
        ok = want.length > 0 && JSON.stringify(sort(want)) === JSON.stringify(sort(got));
      }

      const unanswered =
        userAnswer == null || (question.type !== 'match' && String(userAnswer).trim().length === 0);

      return { qno: question.qno, ok, unanswered };
    });
  }, [normalized.questions, answerMap]);

  const summary: Summary = useMemo(() => {
    const total = questionResults.length;
    const correct = questionResults.filter((result) => result.ok).length;
    const accuracy = total ? (correct / total) * 100 : 0;
    const rawScore = attempt?.score ?? correct;
    const band = attempt?.band ?? Number(((accuracy / 100) * 9).toFixed(1));
    return { total, correct, accuracy, band, rawScore };
  }, [questionResults, attempt]);

  const transcriptSections = useMemo(() => {
    return sections
      .map((section) => ({
        order: section.order_no,
        title: section.title ?? null,
        transcript: section.transcript ?? null,
      }))
      .filter((section) => typeof section.order === 'number')
      .sort((a, b) => a.order - b.order);
  }, [sections]);

  const answersForReview = useMemo<ReviewAnswer[]>(
    () =>
      normalized.answers.map(
        (ans) => ({
          qno: ans.qno,
          answer: ans.answer ?? null,
        }) as ReviewAnswer
      ),
    [normalized.answers]
  );

  if (loading) {
    return (
      <Card className="card-surface rounded-ds-2xl p-6">
        <Skeleton className="h-6 w-48" />
        <div className="mt-4 space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="warning" title="Couldn’t load your review">
        {error}
      </Alert>
    );
  }

  if (!normalized.questions.length) {
    return (
      <EmptyState
        title="Nothing to review yet"
        description="Finish a Listening test to see your answers and explanations here."
        actionLabel="Back to Listening"
        onAction={() => history.back()}
      />
    );
  }

  const testTitle = test?.title || slug;
  const submittedAt = attempt?.submitted_at ? new Date(attempt.submitted_at) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-1">
        <Card className="card-surface rounded-ds-2xl p-6">
          <div className="space-y-4">
            <div>
              <p className="text-small uppercase tracking-wide text-muted-foreground">Listening Test</p>
              <h2 className="text-h3 font-semibold">{testTitle}</h2>
            </div>
            <ScoreCard title="Listening Band" overall={summary.band} />
            <dl className="space-y-2 text-small text-muted-foreground">
              <div className="flex items-center justify-between gap-2">
                <dt>Raw score</dt>
                <dd className="text-foreground font-semibold">
                  {summary.rawScore} / {summary.total || '—'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt>Accuracy</dt>
                <dd className="text-foreground font-semibold">{Math.round(summary.accuracy)}%</dd>
              </div>
              {submittedAt ? (
                <div className="flex items-center justify-between gap-2">
                  <dt>Submitted</dt>
                  <dd className="text-foreground font-semibold">
                    {submittedAt.toLocaleString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </dd>
                </div>
              ) : null}
              {attempt?.id ? (
                <div className="flex items-center justify-between gap-2">
                  <dt>Attempt ID</dt>
                  <dd className="text-xs font-mono text-muted-foreground">{attempt.id}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </Card>

        <TranscriptReview
          sections={transcriptSections}
          questionStatuses={questionResults}
          sectionAssignments={sectionAssignments}
        />
      </div>

      <div className="lg:col-span-2">
        <AnswerReview questions={normalized.questions} answers={answersForReview} />
      </div>
    </div>
  );
}

