import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import clsx from 'clsx';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ReviewComments, type SubmitReviewComment } from '@/components/review/ReviewComments';
import type { ReviewComment } from '@/types/review-comments';
import { track } from '@/lib/analytics/track';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyReviewShareToken } from '@/lib/review/shareToken';
import styles from './ReviewShare.module.css';

interface WritingResponseSummary {
  id: string;
  task: string | null;
  answerText: string;
  wordCount: number | null;
  overallBand: number | null;
  feedbackSummary: string | null;
  strengths: string[];
  improvements: string[];
  createdAt: string;
}

interface AttemptDetails {
  id: string;
  examType: string;
  status: string;
  goalBand: number | null;
  startedAt: string;
  submittedAt: string | null;
  responses: WritingResponseSummary[];
}

type PageProps = {
  token: string;
  attempt: AttemptDetails | null;
  comments: ReviewComment[];
  expiresAt: string;
};

function mapComment(attemptId: string, row: any): ReviewComment {
  return {
    id: row.id,
    attemptId,
    parentId: row.parent_id ?? null,
    authorId: null,
    authorName: row.author_name ?? null,
    authorRole: row.author_role ?? null,
    body: row.body ?? '',
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? null,
  };
}

export const getServerSideProps: GetServerSideProps<PageProps> = async ({ params }) => {
  const token = typeof params?.token === 'string' ? params.token : '';
  if (!token) {
    return { notFound: true };
  }

  let attemptId: string;
  let expiresAt: Date;
  try {
    const payload = verifyReviewShareToken(token);
    attemptId = payload.attemptId;
    expiresAt = payload.expiresAt;
  } catch {
    return { notFound: true };
  }

  const { data: attemptRow, error: attemptError } = await supabaseAdmin
    .from('exam_attempts')
    .select('id, exam_type, status, goal_band, started_at, submitted_at')
    .eq('id', attemptId)
    .maybeSingle();

  if (attemptError || !attemptRow) {
    return { notFound: true };
  }

  const attempt: AttemptDetails = {
    id: attemptRow.id,
    examType: attemptRow.exam_type,
    status: attemptRow.status,
    goalBand: attemptRow.goal_band ?? null,
    startedAt: attemptRow.started_at,
    submittedAt: attemptRow.submitted_at ?? null,
    responses: [],
  };

  if (attempt.examType === 'writing') {
    const { data: responseRows } = await supabaseAdmin
      .from('writing_responses')
      .select(
        'id, task, task_type, answer_text, word_count, overall_band, feedback_summary, feedback_strengths, feedback_improvements, created_at',
      )
      .eq('exam_attempt_id', attempt.id)
      .order('created_at', { ascending: true });

    attempt.responses = (responseRows ?? []).map((row) => ({
      id: row.id,
      task: row.task ?? row.task_type ?? null,
      answerText: row.answer_text ?? '',
      wordCount: row.word_count ?? null,
      overallBand: row.overall_band ?? null,
      feedbackSummary: row.feedback_summary ?? null,
      strengths: Array.isArray(row.feedback_strengths)
        ? row.feedback_strengths.filter((item: unknown): item is string => typeof item === 'string')
        : [],
      improvements: Array.isArray(row.feedback_improvements)
        ? row.feedback_improvements.filter((item: unknown): item is string => typeof item === 'string')
        : [],
      createdAt: row.created_at ?? attempt.startedAt,
    }));
  }

  const { data: commentRows } = await supabaseAdmin
    .from('review_comments')
    .select('id,parent_id,author_name,author_role,body,created_at,updated_at')
    .eq('attempt_id', attempt.id)
    .order('created_at', { ascending: true });

  const comments: ReviewComment[] = (commentRows ?? []).map((row) => mapComment(attempt.id, row));

  return {
    props: {
      token,
      attempt,
      comments,
      expiresAt: expiresAt.toISOString(),
    },
  };
};

export default function SharedReviewPage({ token, attempt, comments: initialComments, expiresAt }: PageProps) {
  const [comments, setComments] = useState<ReviewComment[]>(initialComments);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!attempt) return;
    track('review.share.opened', {
      attempt_id: attempt.id,
      exam_type: attempt.examType,
    });
  }, [attempt]);

  const expiresAtDate = useMemo(() => {
    const date = new Date(expiresAt);
    return Number.isNaN(date.getTime()) ? null : date;
  }, [expiresAt]);

  const formattedExpiry = useMemo(() => {
    if (!expiresAtDate) return null;
    try {
      return expiresAtDate.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return expiresAtDate.toLocaleString();
    }
  }, [expiresAtDate]);

  const handleSubmit = useCallback(
    async ({ message, parentId, name }: SubmitReviewComment) => {
      if (!attempt) {
        throw new Error('Attempt unavailable');
      }

      setSubmitting(true);
      setApiError(null);
      try {
        const response = await fetch('/api/review/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, message, parentId, name }),
        });
        const json = await response.json();
        if (!response.ok || !json.ok) {
          throw new Error(json.error ?? 'Failed to post comment');
        }
        const mapped: ReviewComment[] = (json.data.comments ?? []).map((row: any) => mapComment(attempt.id, {
          id: row.id,
          parent_id: row.parentId ?? null,
          author_name: row.authorName ?? null,
          author_role: row.authorRole ?? null,
          body: row.body ?? '',
          created_at: row.createdAt ?? new Date().toISOString(),
          updated_at: row.updatedAt ?? null,
        }));
        setComments(mapped);
        track('review.comment.submitted', {
          attempt_id: attempt.id,
          has_parent: Boolean(parentId),
          length: message.length,
        });
      } catch (error: unknown) {
        const messageText = error instanceof Error ? error.message : 'Failed to post comment';
        setApiError(messageText);
        throw error instanceof Error ? error : new Error(messageText);
      } finally {
        setSubmitting(false);
      }
    },
    [attempt, token],
  );

  return (
    <>
      <Head>
        <title>Shared Review | GramorX</title>
      </Head>
      <main className="min-h-screen bg-background text-foreground">
        <section className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-10">
          <header className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Shared review</p>
            <h1 className="text-h2 font-slab">Writing attempt feedback</h1>
            {formattedExpiry && (
              <p className="text-small text-muted-foreground">
                Link expires on{' '}
                <time dateTime={expiresAtDate?.toISOString()}>{formattedExpiry}</time>.
              </p>
            )}
          </header>

          {attempt ? (
            <article className="space-y-8">
              <AttemptSummary attempt={attempt} />
              <ResponseList responses={attempt.responses} />
            </article>
          ) : (
            <p className="rounded-xl border border-border bg-background/70 p-6 text-small text-muted-foreground">
              Attempt data is no longer available. The link may have expired.
            </p>
          )}

          <ReviewComments
            comments={comments}
            onSubmit={handleSubmit}
            submitting={submitting}
            error={apiError}
          />
        </section>
      </main>
    </>
  );
}

type AttemptSummaryProps = {
  attempt: AttemptDetails;
};

function AttemptSummary({ attempt }: AttemptSummaryProps) {
  const submittedLabel = attempt.submittedAt ? new Date(attempt.submittedAt) : null;
  const startedLabel = attempt.startedAt ? new Date(attempt.startedAt) : null;

  return (
    <section
      aria-labelledby="attempt-meta-heading"
      className="rounded-2xl border border-border bg-background/70 p-6 shadow-sm"
    >
      <h2 id="attempt-meta-heading" className="text-h4 font-semibold text-foreground">
        Attempt overview
      </h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Module</dt>
          <dd className="text-body font-semibold capitalize">{attempt.examType}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Status</dt>
          <dd className="text-body font-semibold capitalize">{attempt.status.replace(/_/g, ' ')}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Started</dt>
          <dd className="text-body">
            {startedLabel ? startedLabel.toLocaleString() : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Submitted</dt>
          <dd className="text-body">
            {submittedLabel ? submittedLabel.toLocaleString() : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Goal band</dt>
          <dd className="text-body">{attempt.goalBand ?? '—'}</dd>
        </div>
      </dl>
    </section>
  );
}

type ResponseListProps = {
  responses: WritingResponseSummary[];
};

function ResponseList({ responses }: ResponseListProps) {
  if (!responses.length) {
    return (
      <section className="rounded-2xl border border-border bg-background/70 p-6 shadow-sm">
        <h2 className="text-h4 font-semibold text-foreground">Writing responses</h2>
        <p className="mt-3 text-small text-muted-foreground">No writing responses were attached to this attempt.</p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {responses.map((response) => (
        <section
          key={response.id}
          className="rounded-2xl border border-border bg-background/80 p-6 shadow-sm"
          aria-labelledby={`response-${response.id}`}
        >
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id={`response-${response.id}`} className="text-h4 font-semibold text-foreground">
                {response.task ? response.task.toUpperCase() : 'Response'}
              </h2>
              <p className="text-small text-muted-foreground">
                Words: {response.wordCount ?? '—'} · Submitted{' '}
                <time dateTime={response.createdAt}>{new Date(response.createdAt).toLocaleString()}</time>
              </p>
            </div>
            {typeof response.overallBand === 'number' && (
              <span className="rounded-full border border-border px-4 py-1 text-small font-semibold">
                AI band {response.overallBand.toFixed(1)}
              </span>
            )}
          </header>

          <article className="mt-4 space-y-4">
            {response.feedbackSummary && (
              <p className="rounded-xl bg-muted/20 p-4 text-small text-foreground">
                {response.feedbackSummary}
              </p>
            )}

            {response.strengths.length > 0 && (
              <div>
                <h3 className="text-small font-semibold text-foreground">What worked</h3>
                <ul
                  className={clsx('mt-2 list-disc space-y-1 text-small text-foreground/90', styles.listIndent)}
                >
                  {response.strengths.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {response.improvements.length > 0 && (
              <div>
                <h3 className="text-small font-semibold text-foreground">Improve next</h3>
                <ul
                  className={clsx('mt-2 list-disc space-y-1 text-small text-foreground/90', styles.listIndent)}
                >
                  {response.improvements.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h3 className="text-small font-semibold text-foreground">Essay</h3>
              <p className="mt-2 whitespace-pre-wrap rounded-xl border border-border bg-background/60 p-4 text-body leading-relaxed">
                {response.answerText}
              </p>
            </div>
          </article>
        </section>
      ))}
    </div>
  );
}
