import type { GetServerSideProps } from 'next';

import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Container } from '@/components/design-system/Container';
import { ProgressBar } from '@/components/design-system/ProgressBar';
import exercises from '@/data/speaking/exercises.json';
import { getServerClient } from '@/lib/supabaseServer';
import { withPlanPage } from '@/lib/withPlanPage';
import type { SpeakingAttemptRefType } from '@/types/supabase';

interface GoalDTO {
  ipa: string;
  currentAccuracy: number | null;
  targetAccuracy: number;
  lastPracticedAt: string | null;
}

interface AttemptMetrics {
  pron: number | null;
  intonation: number | null;
  stress: number | null;
  fluency: number | null;
  band: number | null;
  wpm: number | null;
  fillers: number | null;
}

interface AttemptSummary {
  id: string;
  createdAt: string;
  refType: SpeakingAttemptRefType;
  refText: string | null;
  exercise: {
    slug: string;
    prompt: string;
    type: string;
    level: string;
  } | null;
  metrics: AttemptMetrics;
  previous?: AttemptMetrics | null;
}

interface DrillSuggestion {
  slug: string;
  prompt: string;
  level: string;
  type: string;
  tags: string[];
}

interface CoachIndexProps {
  goals: GoalDTO[];
  attempts: AttemptSummary[];
  drills: DrillSuggestion[];
}

type ExerciseRecord = {
  slug: string;
  level: string;
  type: string;
  prompt: string;
  tags: string[];
};

const exercisesData = exercises as ExerciseRecord[];

function formatRelative(dateIso: string) {
  const date = new Date(dateIso);
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function deltaText(value: number | null, previous: number | null) {
  if (value == null || previous == null) return '—';
  const delta = value - previous;
  if (Math.abs(delta) < 0.005) return '±0';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(2)}`;
}

export const getServerSideProps: GetServerSideProps<CoachIndexProps> = withPlanPage('starter')(async (ctx) => {
  const supabase = getServerClient(ctx.req as any, ctx.res as any);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      redirect: {
        destination: '/welcome?from=/speaking/coach',
        permanent: false,
      },
    };
  }

  const { data: goalRows } = await supabase
    .from('speaking_pron_goals')
    .select('ipa, current_accuracy, target_accuracy, last_practiced_at')
    .eq('user_id', user.id)
    .order('current_accuracy', { ascending: true });

  const { data: attemptRows } = await supabase
    .from('speaking_attempts')
    .select(
      `id, created_at, ref_type, ref_text, duration_ms, wpm, fillers_count, overall_pron, overall_intonation, overall_stress, overall_fluency, band_estimate,
       exercise:speaking_exercises(slug, prompt, level, type)`
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(12);

  const attempts: AttemptSummary[] = [];
  const previousMetricsByKey = new Map<string, AttemptMetrics>();

  (attemptRows ?? []).forEach((row) => {
    const key = row.ref_type === 'exercise' && row.exercise?.slug ? `exercise:${row.exercise.slug}` : `free:${row.ref_text ?? ''}`;
    const metrics: AttemptMetrics = {
      pron: row.overall_pron,
      intonation: row.overall_intonation,
      stress: row.overall_stress,
      fluency: row.overall_fluency,
      band: row.band_estimate,
      wpm: row.wpm,
      fillers: row.fillers_count,
    };

    const previous = previousMetricsByKey.get(key) ?? null;
    previousMetricsByKey.set(key, metrics);

    attempts.push({
      id: row.id,
      createdAt: row.created_at,
      refType: row.ref_type,
      refText: row.ref_text ?? null,
      exercise: row.exercise
        ? {
            slug: row.exercise.slug,
            prompt: row.exercise.prompt,
            level: row.exercise.level,
            type: row.exercise.type,
          }
        : null,
      metrics,
      previous,
    });
  });

  const goals: GoalDTO[] = (goalRows ?? []).map((goal) => ({
    ipa: goal.ipa,
    currentAccuracy: goal.current_accuracy,
    targetAccuracy: goal.target_accuracy,
    lastPracticedAt: goal.last_practiced_at,
  }));

  const sortedGoals = [...goals].sort((a, b) => {
    const aValue = a.currentAccuracy ?? 0;
    const bValue = b.currentAccuracy ?? 0;
    return aValue - bValue;
  });

  const drills: DrillSuggestion[] = [];
  const usedSlugs = new Set<string>();
  for (const goal of sortedGoals) {
    const match = exercisesData.find((exercise) => !usedSlugs.has(exercise.slug) && exercise.tags.includes(goal.ipa));
    if (match) {
      drills.push(match);
      usedSlugs.add(match.slug);
    }
    if (drills.length >= 3) break;
  }

  if (drills.length < 3) {
    for (const exercise of exercisesData) {
      if (drills.length >= 3) break;
      if (!usedSlugs.has(exercise.slug) && exercise.type !== 'cue_card') {
        drills.push(exercise);
        usedSlugs.add(exercise.slug);
      }
    }
  }

  return {
    props: {
      goals,
      attempts,
      drills,
    },
  };
});

function GoalProgress({ goal }: { goal: GoalDTO }) {
  const value = goal.currentAccuracy ?? 0;
  const percent = Math.round(value * 100);
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <Badge variant="danger" size="sm">
          {goal.ipa}
        </Badge>
        <span className="text-xs text-muted-foreground">Target {Math.round(goal.targetAccuracy * 100)}%</span>
      </div>
      <ProgressBar value={percent} aria-label={`${goal.ipa} accuracy`} />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Current {percent}%</span>
        {goal.lastPracticedAt && <span>Last practised {formatRelative(goal.lastPracticedAt)}</span>}
      </div>
    </Card>
  );
}

const CoachIndexPage = ({ goals, attempts, drills }: CoachIndexProps) => {
  return (
    <Container className="py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <header className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-foreground md:text-4xl">Pronunciation coach</h1>
              <p className="text-sm text-muted-foreground">
                Record drills, get phoneme-level feedback, and follow your daily fix list aligned to IELTS Speaking band descriptors.
              </p>
            </div>
            <Button href="/speaking/coach/free" variant="primary">
              Start free speech drill
            </Button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {goals.length === 0 ? (
            <Card className="col-span-full p-6">
              <h2 className="text-lg font-semibold text-foreground">No weak sounds yet</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Complete your first drill to surface a personalised list of phonemes that need attention.
              </p>
            </Card>
          ) : (
            goals.slice(0, 6).map((goal) => <GoalProgress key={goal.ipa} goal={goal} />)
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-foreground">Today&apos;s micro-drills</h2>
            <Button variant="ghost" href="/speaking/coach/phoneme-th" size="sm">
              View all drills
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {drills.map((drill) => (
              <Card key={drill.slug} className="flex flex-col gap-3 rounded-ds-2xl border border-border/60 bg-card p-5">
                <div className="flex items-center justify-between">
            <Badge variant="info" size="sm">
              {drill.type === 'cue_card' ? 'Cue card' : drill.type === 'sentence' ? 'Sentence' : 'Sound drill'}
            </Badge>
                  <span className="text-xs text-muted-foreground">Level {drill.level}</span>
                </div>
                <p className="text-sm font-medium text-foreground">{drill.prompt}</p>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {drill.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="neutral" size="xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <Button size="sm" href={`/speaking/coach/${drill.slug}`}>
                  Start drill
                </Button>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">Recent attempts</h2>
          {attempts.length === 0 ? (
            <Card className="p-6">
              <p className="text-sm text-muted-foreground">No attempts yet—record a drill to unlock analytics.</p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {attempts.slice(0, 5).map((attempt) => (
                <Card key={attempt.id} className="flex flex-col gap-3 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-foreground">
                        {attempt.exercise ? attempt.exercise.prompt : 'Free speech reflection'}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {attempt.exercise ? `${attempt.exercise.level} · ${attempt.exercise.type}` : 'Unscripted free practice'} · {formatRelative(attempt.createdAt)}
                      </p>
                    </div>
                    <Button href={`/speaking/coach/${attempt.exercise?.slug ?? 'free'}`} variant="soft" tone="primary" size="sm">
                      Review & retry
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-ds-xl border border-border/60 bg-card/70 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Pronunciation</p>
                      <p className="text-xl font-semibold text-foreground">{attempt.metrics.pron?.toFixed(2) ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">Δ {deltaText(attempt.metrics.pron, attempt.previous?.pron ?? null)}</p>
                    </div>
                    <div className="rounded-ds-xl border border-border/60 bg-card/70 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Fluency</p>
                      <p className="text-xl font-semibold text-foreground">{attempt.metrics.fluency?.toFixed(2) ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">Δ {deltaText(attempt.metrics.fluency, attempt.previous?.fluency ?? null)}</p>
                    </div>
                    <div className="rounded-ds-xl border border-border/60 bg-card/70 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Band estimate</p>
                      <p className="text-xl font-semibold text-foreground">{attempt.metrics.band?.toFixed(1) ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">Δ {deltaText(attempt.metrics.band, attempt.previous?.band ?? null)}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </Container>
  );
};

export default CoachIndexPage;
