import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import * as React from 'react';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Alert } from '@/components/design-system/Alert';
import { getServerClient } from '@/lib/supabaseServer';

const CRITERIA_META = [
  { key: 'task', label: 'Task Response', aliases: ['task', 'task_response', 'taskAchievement'] },
  { key: 'coherence', label: 'Coherence & Cohesion', aliases: ['coherence', 'cohesion', 'coherence_and_cohesion'] },
  { key: 'lexical', label: 'Lexical Resource', aliases: ['lexical', 'lexical_resource', 'vocabulary'] },
  { key: 'grammar', label: 'Grammar & Accuracy', aliases: ['grammar', 'grammar_accuracy', 'grammar_range'] },
] as const;

const CRITERIA_KEYS = CRITERIA_META.map((item) => item.key);
type CriteriaKey = (typeof CRITERIA_KEYS)[number];

type CriteriaBreakdown = Record<CriteriaKey, number>;

type CriteriaFeedback = {
  key: CriteriaKey;
  label: string;
  comments: string[];
};

type NormalizedFeedback = {
  overall: string[];
  criteria: CriteriaFeedback[];
  rawText?: string | null;
};

type ViewerRole = 'student' | 'teacher' | 'admin' | null;

type AttemptRow = {
  id: string;
  user_id: string | null;
  task_type: 'T1' | 'T2' | 'GT' | null;
  prompt: string | null;
  essay_text: string | null;
  band_overall: number | null;
  band_breakdown: unknown;
  feedback: unknown;
  created_at: string | null;
  updated_at: string | null;
};

type PageAttempt = {
  id: string;
  taskType: AttemptRow['task_type'];
  prompt: string;
  essayText: string;
  bandOverall: number | null;
  bandBreakdown: CriteriaBreakdown | null;
  feedback: NormalizedFeedback;
  createdAt: string | null;
  updatedAt: string | null;
};

type Props = {
  attempt: PageAttempt;
  viewer: { role: ViewerRole; isOwner: boolean };
};

type RoleFromMetadata = 'student' | 'teacher' | 'admin' | 'guest' | string | null | undefined;

const toParagraphs = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => toParagraphs(item))
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    return trimmed
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .filter(Boolean);
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return [String(value)];
  }
  if (typeof value === 'object') {
    try {
      return [JSON.stringify(value)];
    } catch {
      return [];
    }
  }
  return [];
};

const pickFromObject = (obj: Record<string, unknown>, aliases: readonly string[]): unknown => {
  for (const alias of aliases) {
    if (alias in obj) return obj[alias];
  }
  return undefined;
};

const normalizeBreakdown = (value: unknown): CriteriaBreakdown | null => {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const out: Partial<CriteriaBreakdown> = {};
  for (const meta of CRITERIA_META) {
    const raw = pickFromObject(record, [meta.key, ...meta.aliases]);
    const num = typeof raw === 'number' ? raw : raw != null ? Number(raw) : NaN;
    if (!Number.isFinite(num)) return null;
    out[meta.key] = Number(num);
  }
  return out as CriteriaBreakdown;
};

const normalizeFeedback = (raw: unknown): NormalizedFeedback => {
  if (!raw) return { overall: [], criteria: [], rawText: null };

  if (typeof raw === 'string') {
    return { overall: toParagraphs(raw), criteria: [], rawText: raw };
  }

  if (Array.isArray(raw)) {
    const paragraphs = toParagraphs(raw);
    const rawText = paragraphs.join('\n\n');
    return { overall: paragraphs, criteria: [], rawText };
  }

  if (typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    const overallKeys = ['overall', 'summary', 'overall_comment', 'general', 'comment', 'notes', 'overview'];
    const overall: string[] = [];
    for (const key of overallKeys) {
      if (key in record) {
        overall.push(...toParagraphs(record[key]));
      }
    }
    if ('bullets' in record) {
      overall.push(...toParagraphs(record.bullets));
    }
    if ('next_steps' in record) {
      overall.push(...toParagraphs(record.next_steps));
    }

    const criteria: CriteriaFeedback[] = [];
    const candidateCriteriaSources = [
      typeof record.criteria === 'object' ? (record.criteria as Record<string, unknown>) : null,
      record,
    ].filter(Boolean) as Record<string, unknown>[];

    for (const meta of CRITERIA_META) {
      let text: string[] = [];
      for (const source of candidateCriteriaSources) {
        const rawValue = pickFromObject(source, [meta.key, ...meta.aliases]);
        if (rawValue) {
          text = toParagraphs(rawValue);
          if (text.length) break;
        }
      }
      if (text.length) {
        criteria.push({ key: meta.key, label: meta.label, comments: text });
      }
    }

    const rawText = (() => {
      try {
        return JSON.stringify(raw);
      } catch {
        return null;
      }
    })();

    return { overall, criteria, rawText };
  }

  return { overall: toParagraphs(raw), criteria: [], rawText: String(raw) };
};

const normalizeAttempt = (row: AttemptRow): PageAttempt => {
  const bandOverall = typeof row.band_overall === 'number' ? row.band_overall : null;
  const bandBreakdown = normalizeBreakdown(row.band_breakdown);
  const feedback = normalizeFeedback(row.feedback);

  return {
    id: row.id,
    taskType: row.task_type,
    prompt: row.prompt ?? 'Prompt unavailable.',
    essayText: row.essay_text ?? 'Response unavailable.',
    bandOverall,
    bandBreakdown: bandBreakdown,
    feedback,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const responseId = typeof ctx.params?.id === 'string' ? ctx.params.id : null;
  if (!responseId) return { notFound: true };

  const supabase = getServerClient(ctx.req as any, ctx.res as any);
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id ?? null;
  const roleMetadata = (auth.user?.app_metadata?.role as RoleFromMetadata) ?? (auth.user?.user_metadata?.role as RoleFromMetadata);
  const role = (roleMetadata === 'student' || roleMetadata === 'teacher' || roleMetadata === 'admin') ? roleMetadata : null;

  const { data: attempt, error } = await supabase
    .from('writing_attempts')
    .select('id, user_id, task_type, prompt, essay_text, band_overall, band_breakdown, feedback, created_at, updated_at')
    .eq('id', responseId)
    .maybeSingle();

  if (error || !attempt) return { notFound: true };

  const isOwner = attempt.user_id ? attempt.user_id === userId : false;
  const isTeacher = role === 'teacher' || role === 'admin';
  if (!isOwner && !isTeacher) return { notFound: true };

  return {
    props: {
      attempt: normalizeAttempt(attempt as AttemptRow),
      viewer: { role, isOwner },
    },
  };
};

type WritingBandBreakdownProps = {
  overall: number;
  breakdown: CriteriaBreakdown;
  className?: string;
};

const WritingBandBreakdown: React.FC<WritingBandBreakdownProps> = ({ overall, breakdown, className }) => {
  const bars = CRITERIA_META.map((meta) => {
    const value = breakdown[meta.key];
    const pct = Math.round((value / 9) * 100);
    return (
      <div key={meta.key}>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-small font-medium">{meta.label}</span>
          <span className="text-caption text-muted-foreground">Band {value.toFixed(1)}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted">
          <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  });

  return (
    <div className={className}>
      <p className="text-small text-muted-foreground">AI estimated overall</p>
      <p className="text-displayLg font-semibold">Band {overall.toFixed(1)}</p>
      <div className="mt-6 grid gap-4">{bars}</div>
    </div>
  );
};

const FeedbackBlock: React.FC<{ title: string; comments: string[] }> = ({ title, comments }) => {
  if (!comments.length) return null;
  if (comments.length === 1) {
    return (
      <section className="rounded-xl border border-border p-4">
        <h3 className="text-body font-semibold">{title}</h3>
        <p className="mt-2 whitespace-pre-line text-small text-muted-foreground">{comments[0]}</p>
      </section>
    );
  }
  return (
    <section className="rounded-xl border border-border p-4">
      <h3 className="text-body font-semibold">{title}</h3>
      <ul className="mt-2 list-disc space-y-2 pl-5 text-small text-muted-foreground">
        {comments.map((item, index) => (
          <li key={index} className="whitespace-pre-line">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
};

const OverallFeedback: React.FC<{ comments: string[]; fallback?: string | null }> = ({ comments, fallback }) => {
  if (comments.length === 0) {
    if (!fallback) return (
      <p className="text-small text-muted-foreground">No written feedback was provided for this attempt.</p>
    );
    return (
      <p className="whitespace-pre-line text-small text-muted-foreground">{fallback}</p>
    );
  }
  if (comments.length === 1) {
    return (
      <p className="whitespace-pre-line text-small text-muted-foreground">{comments[0]}</p>
    );
  }
  return (
    <ul className="list-disc space-y-2 pl-5 text-small text-muted-foreground">
      {comments.map((item, index) => (
        <li key={index} className="whitespace-pre-line">
          {item}
        </li>
      ))}
    </ul>
  );
};

const formatDateTime = (iso: string | null): string | null => {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return null;
  }
};

const TeacherTools: React.FC<{ attemptId: string; role: ViewerRole }> = ({ attemptId, role }) => {
  if (role !== 'teacher' && role !== 'admin') return null;
  return (
    <Card className="card-surface rounded-ds-2xl p-6">
      <h2 className="text-h4">Teacher workspace</h2>
      <p className="mt-2 text-small text-muted-foreground">
        Need to adjust this score or add personalised comments? Use the review console to override AI feedback and leave guidance for the student.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          href={`/admin/reviews/${attemptId}`}
          variant="secondary"
          shape="rounded"
          className="rounded-ds-xl"
        >
          Open review console
        </Button>
        <Button
          href="/teacher"
          variant="ghost"
          shape="rounded"
          className="rounded-ds-xl"
        >
          Teacher dashboard
        </Button>
      </div>
      <p className="mt-3 text-caption text-muted-foreground">
        Future updates will let you record final teacher scores directly on this page.
      </p>
    </Card>
  );
};

const WritingResultPage: React.FC<Props> = ({ attempt, viewer }) => {
  const submittedAt = formatDateTime(attempt.createdAt);
  const updatedAt = formatDateTime(attempt.updatedAt);
  const hasScores = typeof attempt.bandOverall === 'number' && attempt.bandBreakdown !== null;

  return (
    <>
      <Head>
        <title>Writing feedback • GramorX</title>
      </Head>
      <section className="bg-lightBg py-16 dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <Container>
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-caption uppercase tracking-wide text-muted-foreground">Writing result</p>
              <h1 className="font-slab text-displaySm text-foreground md:text-display">AI feedback & score</h1>
              {submittedAt ? (
                <p className="mt-1 text-small text-muted-foreground">
                  Submitted {submittedAt}
                  {updatedAt && updatedAt !== submittedAt ? ` • Updated ${updatedAt}` : ''}
                </p>
              ) : null}
              {!viewer.isOwner ? (
                <div className="mt-3">
                  <Badge variant="secondary" size="sm">Teacher view</Badge>
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button href="/writing" variant="secondary" shape="rounded" className="rounded-ds-xl">
                ← Writing prompts
              </Button>
              <Button href="/dashboard" variant="ghost" shape="rounded" className="rounded-ds-xl">
                Dashboard
              </Button>
            </div>
          </header>

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="grid gap-6">
              <Card className="card-surface rounded-ds-2xl p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-h3">Band score</h2>
                    <p className="mt-1 text-body text-muted-foreground">
                      Automatic IELTS scoring with rubric-level breakdown.
                    </p>
                  </div>
                  {attempt.taskType ? (
                    <Badge variant="info" size="sm">Task {attempt.taskType}</Badge>
                  ) : null}
                </div>

                {hasScores ? (
                  <WritingBandBreakdown
                    overall={attempt.bandOverall as number}
                    breakdown={attempt.bandBreakdown as CriteriaBreakdown}
                    className="mt-6"
                  />
                ) : (
                  <Alert variant="info" title="Band score unavailable" className="mt-6">
                    We could not find AI scores for this response yet. Trigger a re-evaluation or contact support if this persists.
                  </Alert>
                )}
              </Card>

              <Card className="card-surface rounded-ds-2xl p-6">
                <h2 className="text-h3">AI feedback</h2>
                <p className="mt-1 text-body text-muted-foreground">
                  Comments organised by IELTS criteria to help prioritise revisions.
                </p>

                <div className="mt-6 grid gap-4">
                  <section className="rounded-xl border border-border p-4">
                    <h3 className="text-body font-semibold">Overall guidance</h3>
                    <div className="mt-2 text-small text-muted-foreground">
                      <OverallFeedback comments={attempt.feedback.overall} fallback={attempt.feedback.rawText} />
                    </div>
                  </section>

                  {attempt.feedback.criteria.length ? (
                    attempt.feedback.criteria.map((item) => (
                      <FeedbackBlock key={item.key} title={item.label} comments={item.comments} />
                    ))
                  ) : null}
                </div>
              </Card>

              <TeacherTools attemptId={attempt.id} role={viewer.role} />
            </div>

            <div className="grid gap-6">
              <Card className="card-surface rounded-ds-2xl p-6">
                <h2 className="text-h4">Prompt</h2>
                <p className="mt-2 whitespace-pre-line text-body text-muted-foreground">{attempt.prompt}</p>
              </Card>

              <Card className="card-surface rounded-ds-2xl p-6">
                <h2 className="text-h4">Student response</h2>
                <p className="mt-2 whitespace-pre-wrap text-body text-foreground">{attempt.essayText}</p>
              </Card>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
};

export default WritingResultPage;
