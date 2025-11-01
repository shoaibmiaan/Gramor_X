import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { GetServerSideProps } from 'next';
import Link from 'next/link';

import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Container } from '@/components/design-system/Container';
import { EmptyState } from '@/components/design-system/EmptyState';
import { Input } from '@/components/design-system/Input';
import { Radio } from '@/components/design-system/Radio';
import { Separator } from '@/components/design-system/Separator';
import { ProgressBar } from '@/components/design-system/ProgressBar';
import { Select } from '@/components/design-system/Select';
import { Textarea } from '@/components/design-system/Textarea';
import { withPlanPage } from '@/lib/withPlanPage';
import { getServerClient } from '@/lib/supabaseServer';
import type { Database } from '@/types/supabase';
import type { WritingTaskType } from '@/lib/writing/schemas';
import {
  buildRetakeReminder,
  ensureNotificationChannels,
  getDailyMicroPrompt,
  shouldSendMicroPromptToday,
} from '@/lib/writing/notifications';

interface PromptCard {
  id: string;
  slug: string;
  topic: string;
  taskType: WritingTaskType;
  difficulty: number;
  outlineSummary: string | null;
}

type TaskFilter = 'all' | WritingTaskType;
type DifficultyFilter = 'all' | '1' | '2' | '3' | '4' | '5';

type GeneratorFormState = {
  taskType: WritingTaskType;
  difficulty: number;
  count: 1 | 3 | 5;
  theme: string;
  style: string;
};

interface AttemptSummary {
  id: string;
  promptSlug: string;
  promptTopic: string;
  status: Database['public']['Enums']['writing_attempt_status'];
  updatedAt: string;
  wordCount: number;
  taskType: WritingTaskType;
  overallBand: number | null;
  hasFeedback: boolean;
}

interface ReadinessSummary {
  pass: boolean;
  missing: string[];
}

interface PageProps {
  prompts: PromptCard[];
  drafts: AttemptSummary[];
  recent: AttemptSummary[];
  readiness: ReadinessSummary | null;
  plan: {
    windowStart: string;
    windowEnd: string | null;
    redraftsCompleted: number;
    drillsCompleted: number;
    mocksCompleted: number;
  };
  microPrompt: {
    message: string;
    lastSentAt: string | null;
    channels: string[];
    canSendWhatsApp: boolean;
    alreadySentToday: boolean;
    retakeReminder: {
      message: string;
      completion: number;
      missing: string[];
    } | null;
  };
}

const statusLabel: Record<AttemptSummary['status'], string> = {
  draft: 'Draft in progress',
  submitted: 'Scoring pending',
  scored: 'Scored',
};

const difficultyLabel = (value: number) => {
  if (value <= 1) return 'Beginner';
  if (value === 2) return 'Intermediate';
  if (value === 3) return 'Upper‑intermediate';
  if (value === 4) return 'Advanced';
  return 'Band 8+';
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));

const RETAKE_PLAN_TARGETS = { redrafts: 6, drills: 8, mocks: 2 } as const;

const progressPercentage = (value: number, target: number) => {
  if (target <= 0) return value > 0 ? 100 : 0;
  return Math.max(0, Math.min(100, Math.round((value / target) * 100)));
};

const WritingDashboard = ({ prompts, drafts, recent, readiness, plan, microPrompt }: PageProps) => {
  const [startingPromptId, setStartingPromptId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [microPromptState, setMicroPromptState] = useState<PageProps['microPrompt']>(microPrompt);
  const [microPromptLoading, setMicroPromptLoading] = useState(false);
  const [microPromptError, setMicroPromptError] = useState<string | null>(null);
  const [libraryPrompts, setLibraryPrompts] = useState<PromptCard[]>(prompts);
  const [filters, setFilters] = useState<{ search: string; task: TaskFilter; difficulty: DifficultyFilter }>(
    { search: '', task: 'all', difficulty: 'all' },
  );
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [generatorState, setGeneratorState] = useState<GeneratorFormState>({
    taskType: 'task2',
    difficulty: 3,
    count: 3,
    theme: '',
    style: '',
  });
  const [generatorError, setGeneratorError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const passReadiness = readiness?.pass ?? false;
  const missingSummary = readiness?.missing ?? [];

  const planTargets = RETAKE_PLAN_TARGETS;

  useEffect(() => {
    setLibraryPrompts(prompts);
  }, [prompts]);

  const filteredPrompts = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    return [...libraryPrompts]
      .sort((a, b) => {
        const diffDelta = a.difficulty - b.difficulty;
        if (diffDelta !== 0) return diffDelta;
        return a.topic.localeCompare(b.topic);
      })
      .filter((prompt) => {
        const matchesSearch =
          query.length === 0 ||
          prompt.topic.toLowerCase().includes(query) ||
          (prompt.outlineSummary ?? '').toLowerCase().includes(query);
        const matchesTask = filters.task === 'all' || prompt.taskType === filters.task;
        const matchesDifficulty =
          filters.difficulty === 'all' || prompt.difficulty === Number(filters.difficulty);
        return matchesSearch && matchesTask && matchesDifficulty;
      });
  }, [libraryPrompts, filters]);

  const refreshMicroPrompt = useCallback(async () => {
    try {
      const response = await fetch('/api/writing/notifications/micro-prompt');
      const payload = (await response.json()) as
        | ({ ok: true; message: string; lastSentAt: string | null; channels: string[]; canSendWhatsApp: boolean; alreadySentToday: boolean; retakeReminder: PageProps['microPrompt']['retakeReminder'] })
        | ({ ok: false; error: string });

      if (!response.ok || !payload || !('ok' in payload) || !payload.ok) {
        const reason = !payload || !('error' in payload) ? 'Unable to refresh micro prompt' : payload.error;
        throw new Error(reason);
      }

      setMicroPromptState({
        message: payload.message,
        lastSentAt: payload.lastSentAt,
        channels: payload.channels,
        canSendWhatsApp: payload.canSendWhatsApp,
        alreadySentToday: payload.alreadySentToday,
        retakeReminder: payload.retakeReminder,
      });
      setMicroPromptError(null);
    } catch (err) {
      setMicroPromptError(err instanceof Error ? err.message : 'Unable to refresh micro prompt');
    }
  }, []);

  const handleSendMicroPrompt = useCallback(async () => {
    setMicroPromptLoading(true);
    setMicroPromptError(null);
    try {
      const response = await fetch('/api/writing/notifications/micro-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels: ['in_app', 'whatsapp'], source: 'dashboard' }),
      });
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Unable to send micro prompt');
      }
      await refreshMicroPrompt();
    } catch (err) {
      setMicroPromptError(err instanceof Error ? err.message : 'Unable to send micro prompt');
    } finally {
      setMicroPromptLoading(false);
    }
  }, [refreshMicroPrompt]);

  const handleStart = async (prompt: PromptCard) => {
    setStartingPromptId(prompt.id);
    setError(null);
    try {
      const response = await fetch('/api/writing/attempts/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptId: prompt.id, taskType: prompt.taskType }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error((payload as { error?: string })?.error ?? 'Failed to start attempt');
      }

      const payload = (await response.json()) as { attemptId: string };
      window.location.assign(`/writing/${prompt.slug}?attemptId=${payload.attemptId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error starting attempt');
    } finally {
      setStartingPromptId(null);
    }
  };

  const planProgressItems = [
    { key: 'redrafts', label: 'Redrafts completed', value: plan.redraftsCompleted, target: planTargets.redrafts },
    { key: 'drills', label: 'Micro-drills logged', value: plan.drillsCompleted, target: planTargets.drills },
    { key: 'mocks', label: 'Mock attempts reviewed', value: plan.mocksCompleted, target: planTargets.mocks },
  ] as const;

  const handleClearFilters = useCallback(() => {
    setFilters({ search: '', task: 'all', difficulty: 'all' });
    setStatusMessage('Filters cleared. Showing all prompts.');
  }, []);

  const handleRefreshPrompts = useCallback(async () => {
    setIsRefreshing(true);
    setLibraryError(null);
    setStatusMessage('');
    try {
      const response = await fetch('/api/writing/prompts?limit=24');
      const payload = (await response.json()) as
        | { ok: true; prompts: PromptCard[] }
        | { ok: false; error: string };
      if (!response.ok || !payload || !('ok' in payload) || !payload.ok) {
        const reason = !payload || !('error' in payload) ? 'Unable to refresh prompts' : payload.error;
        throw new Error(reason);
      }
      setLibraryPrompts(payload.prompts);
      setStatusMessage(`Prompt library refreshed with ${payload.prompts.length} prompts.`);
    } catch (err) {
      setLibraryError(err instanceof Error ? err.message : 'Unable to refresh prompts');
      setStatusMessage('');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const handleGeneratePrompts = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isGenerating) return;
      setGeneratorError(null);
      setStatusMessage('');
      setIsGenerating(true);
      try {
        const response = await fetch('/api/writing/prompts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskType: generatorState.taskType,
            difficulty: generatorState.difficulty,
            count: generatorState.count,
            theme: generatorState.theme.trim() || undefined,
            style: generatorState.style.trim() || undefined,
          }),
        });

        const payload = (await response.json()) as
          | { ok: true; prompts: PromptCard[] }
          | { ok: false; error: string };

        if (!response.ok || !payload || !('ok' in payload) || !payload.ok) {
          const reason = !payload || !('error' in payload) ? 'Prompt generation failed' : payload.error;
          throw new Error(reason);
        }

        setLibraryPrompts((prev) => [...payload.prompts, ...prev]);
        setStatusMessage(`Added ${payload.prompts.length} AI-generated prompt${
          payload.prompts.length === 1 ? '' : 's'
        } to the library.`);
        setGeneratorState((prev) => ({ ...prev, theme: '', style: '' }));
      } catch (err) {
        setGeneratorError(err instanceof Error ? err.message : 'Unable to generate prompts');
      } finally {
        setIsGenerating(false);
      }
    },
    [generatorState, isGenerating],
  );

  return (
    <Container className="relative py-12 sm:py-16">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.12),_transparent_55%)]"
        aria-hidden
      />
      <div className="mx-auto flex max-w-6xl flex-col gap-12">
        <Card className="relative overflow-hidden border border-border/50 bg-gradient-to-br from-primary/10 via-background/80 to-background/95 p-8 shadow-xl sm:p-10">
          <div className="absolute inset-y-0 right-0 hidden w-64 translate-x-24 rounded-full bg-primary/20 blur-3xl lg:block" aria-hidden />
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <Badge variant="soft" tone={passReadiness ? 'success' : 'info'} size="sm">
                {passReadiness ? 'Redraft unlocked' : 'Stay consistent'}
              </Badge>
              <div className="space-y-3">
                <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">Writing studio</h1>
                <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
                  Draft confidently, unlock targeted drills, and review detailed scoring for Task 1 and Task 2 attempts. Autosave keeps your work safe while readiness gates make sure every redraft counts.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary" href="#prompt-library" size="lg">
                  Explore prompts
                </Button>
                <Button variant="outline" href="/writing/review" size="lg">
                  Review past attempts
                </Button>
                <Button variant="ghost" href="/writing/drills" size="lg">
                  Jump into drills
                </Button>
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
            </div>
            <div className="flex w-full flex-col gap-4 rounded-2xl border border-border/60 bg-background/70 p-5 text-sm text-muted-foreground shadow-inner lg:max-w-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">Study window</span>
                <Badge variant="soft" tone="info" size="sm">
                  {formatDate(plan.windowStart)} – {plan.windowEnd ? formatDate(plan.windowEnd) : 'TBD'}
                </Badge>
              </div>
              <Separator />
              <ul className="space-y-3">
                {planProgressItems.map((item) => (
                  <li key={item.key} className="space-y-2">
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      <span>{item.label}</span>
                      <span className="font-semibold text-foreground">
                        {item.value}/{item.target}
                      </span>
                    </div>
                    <ProgressBar
                      value={progressPercentage(item.value, item.target)}
                      tone="info"
                      ariaLabel={`${item.label} progress`}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
          <Card id="prompt-library" className="card-surface flex flex-col gap-6 p-6 sm:p-8">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold text-foreground">Prompt library</h2>
                <p className="text-sm text-muted-foreground">
                  Choose a prompt to launch a focused editor with autosave, timers, and structured scoring.
                </p>
              </div>
              <Badge variant="soft" tone="default" size="sm">
                {filteredPrompts.length} ready to attempt
              </Badge>
            </div>
            <form
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
              aria-label="Filter prompts"
              onSubmit={(event) => event.preventDefault()}
            >
              <Input
                label="Search"
                placeholder="Search by topic or outline"
                value={filters.search}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, search: event.currentTarget.value }))
                }
                variant="subtle"
                size="md"
              />
              <Select
                label="Task type"
                value={filters.task}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, task: event.currentTarget.value as TaskFilter }))
                }
                variant="subtle"
              >
                <option value="all">All tasks</option>
                <option value="task1">Task 1</option>
                <option value="task2">Task 2</option>
              </Select>
              <Select
                label="Difficulty"
                value={filters.difficulty}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, difficulty: event.currentTarget.value as DifficultyFilter }))
                }
                variant="subtle"
              >
                <option value="all">All levels</option>
                <option value="1">Beginner</option>
                <option value="2">Intermediate</option>
                <option value="3">Upper-intermediate</option>
                <option value="4">Advanced</option>
                <option value="5">Band 8+</option>
              </Select>
              <div className="flex items-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleClearFilters}>
                  Clear
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRefreshPrompts}
                  loading={isRefreshing}
                  loadingText="Refreshing"
                >
                  Refresh
                </Button>
              </div>
            </form>
            {libraryError && <p className="text-sm text-danger">{libraryError}</p>}
            {statusMessage && (
              <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
                {statusMessage}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredPrompts.map((prompt) => (
                <Card
                  key={prompt.id}
                  className="flex h-full flex-col gap-5 rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/50"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <Badge variant="soft" tone="info" size="sm" className="capitalize">
                        {prompt.taskType === 'task1' ? 'Task 1' : 'Task 2'}
                      </Badge>
                    </span>
                    <Badge variant="soft" tone="default" size="sm">
                      {difficultyLabel(prompt.difficulty)}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">{prompt.topic}</h3>
                    {prompt.outlineSummary && (
                      <p className="line-clamp-3 text-sm text-muted-foreground">{prompt.outlineSummary}</p>
                    )}
                  </div>
                  <div className="mt-auto flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      loading={startingPromptId === prompt.id}
                      onClick={() => handleStart(prompt)}
                    >
                      Start writing
                    </Button>
                    <Button size="sm" variant="outline" href={`/writing/${prompt.slug}`}>
                      View prompt
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
            {libraryPrompts.length === 0 && (
              <EmptyState
                title="No prompts yet"
                description="Admins can seed writing prompts from Supabase. Check back soon for new practice sets."
              />
            )}
            <Separator />
            <section aria-labelledby="ai-generator-heading" className="space-y-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 id="ai-generator-heading" className="text-xl font-semibold text-foreground">
                    AI prompt generator
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Craft fresh prompts tailored to your focus and add them straight to the library.
                  </p>
                </div>
                <Badge variant="soft" tone="info" size="sm">
                  Instant add
                </Badge>
              </div>
              <form
                className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3"
                onSubmit={handleGeneratePrompts}
                aria-describedby={generatorError ? 'generator-error' : undefined}
              >
                <Select
                  label="Task"
                  value={generatorState.taskType}
                  onChange={(event) =>
                    setGeneratorState((prev) => ({ ...prev, taskType: event.currentTarget.value as WritingTaskType }))
                  }
                  required
                  variant="subtle"
                >
                  <option value="task1">Task 1</option>
                  <option value="task2">Task 2</option>
                </Select>
                <Select
                  label="Difficulty"
                  value={String(generatorState.difficulty)}
                  onChange={(event) =>
                    setGeneratorState((prev) => ({ ...prev, difficulty: Number(event.currentTarget.value) }))
                  }
                  required
                  variant="subtle"
                >
                  <option value="1">Beginner</option>
                  <option value="2">Intermediate</option>
                  <option value="3">Upper-intermediate</option>
                  <option value="4">Advanced</option>
                  <option value="5">Band 8+</option>
                </Select>
                <Input
                  label="Theme (optional)"
                  placeholder="e.g. climate change, city planning"
                  value={generatorState.theme}
                  onChange={(event) =>
                    setGeneratorState((prev) => ({ ...prev, theme: event.currentTarget.value }))
                  }
                  variant="subtle"
                />
                <Textarea
                  label="Style hints (optional)"
                  placeholder="Any structures, tones, or focus areas to nudge the AI."
                  value={generatorState.style}
                  onChange={(event) =>
                    setGeneratorState((prev) => ({ ...prev, style: event.currentTarget.value }))
                  }
                  variant="subtle"
                  size="sm"
                  className="xl:col-span-2"
                />
                <fieldset className="space-y-2 rounded-2xl border border-border/60 bg-card/70 p-4" role="group">
                  <legend className="text-sm font-medium text-muted-foreground">Number of prompts</legend>
                  <div className="flex flex-wrap gap-4">
                    {[1, 3, 5].map((value) => (
                      <Radio
                        key={value}
                        name="prompt-count"
                        value={value}
                        label={`${value} ${value === 1 ? 'prompt' : 'prompts'}`}
                        checked={generatorState.count === value}
                        onChange={() => setGeneratorState((prev) => ({ ...prev, count: value as 1 | 3 | 5 }))}
                      />
                    ))}
                  </div>
                </fieldset>
                <div className="flex items-end gap-3 xl:col-span-3">
                  <Button type="submit" variant="primary" loading={isGenerating} loadingText="Generating">
                    Generate prompts
                  </Button>
                  {generatorError && (
                    <p id="generator-error" className="text-sm text-danger" role="alert">
                      {generatorError}
                    </p>
                  )}
                </div>
              </form>
            </section>
            {filteredPrompts.length === 0 && (
              <EmptyState
                title="No prompts match"
                description="Adjust your filters or generate new prompts to keep practicing."
              />
            )}
          </Card>

          <div className="flex flex-col gap-6 lg:sticky lg:top-24">
            <Card id="retake-plan" className="card-surface flex flex-col gap-5 p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-foreground">Readiness gate</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="soft" tone={passReadiness ? 'success' : 'warning'} size="sm">
                      {passReadiness ? 'Ready for redraft' : 'Action needed'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {passReadiness ? 'You can schedule a redraft attempt.' : 'Complete the actions below to unlock redrafts.'}
                    </span>
                  </div>
                </div>
              </div>
              {readiness ? (
                <div className="space-y-3">
                  {!passReadiness ? (
                    <ul className="space-y-2 rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">
                      {missingSummary.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-primary/70" aria-hidden />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Keep momentum going by scheduling a redraft within the next two weeks for the biggest score gains.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Complete drills and submit attempts to generate a readiness score.
                </p>
              )}
              <Separator />
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>New to readiness gates? Complete two targeted drills and submit one scored attempt to unlock redrafts.</p>
                <Link href="/writing" className="text-primary underline underline-offset-4">
                  Learn more
                </Link>
              </div>
            </Card>

            <Card className="card-surface flex flex-col gap-5 p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold text-foreground">Daily micro prompt</h2>
                  <p className="text-sm text-muted-foreground">A quick nudge to sharpen today&apos;s session.</p>
                </div>
                <Badge variant="soft" tone="info" size="sm">
                  Updated daily
                </Badge>
              </div>
              <p className="rounded-2xl border border-dashed border-border/50 bg-muted/50 p-3 text-sm text-foreground">
                {microPromptState.message}
              </p>
              {microPromptState.retakeReminder && (
                <div className="rounded-2xl border border-dashed border-border/40 bg-card/60 p-3 text-xs text-muted-foreground">
                  {microPromptState.retakeReminder.message}
                </div>
              )}
              {microPromptError && <p className="text-sm text-danger">{microPromptError}</p>}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>
                  {microPromptState.lastSentAt
                    ? `Last nudged ${formatDateTime(microPromptState.lastSentAt)}`
                    : 'Not delivered yet today'}
                </span>
                {!microPromptState.canSendWhatsApp && (
                  <span>
                    WhatsApp nudges require opt-in — manage in{' '}
                    <Link href="/notifications" className="text-primary underline underline-offset-4">
                      notification settings
                    </Link>
                    .
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleSendMicroPrompt}
                  disabled={microPromptState.alreadySentToday && !microPromptLoading}
                  loading={microPromptLoading}
                >
                  {microPromptState.alreadySentToday ? 'Sent for today' : 'Send reminder now'}
                </Button>
                <Button size="sm" variant="ghost" onClick={refreshMicroPrompt}>
                  Refresh tip
                </Button>
              </div>
              {microPromptState.alreadySentToday && (
                <p className="text-xs text-muted-foreground">
                  Tip already delivered today — check back tomorrow for a fresh focus cue.
                </p>
              )}
            </Card>

            <Card className="card-surface flex flex-col gap-5 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">14-day retake plan</h2>
                <Badge variant="soft" tone="info" size="sm">
                  {formatDate(plan.windowStart)} – {plan.windowEnd ? formatDate(plan.windowEnd) : 'TBD'}
                </Badge>
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {planProgressItems.map((item) => (
                  <li key={`sidebar-${item.key}`} className="space-y-2 rounded-xl border border-border/40 p-3">
                    <div className="flex items-center justify-between">
                      <span>{item.label}</span>
                      <span className="font-medium text-foreground">
                        {item.value}/{item.target}
                      </span>
                    </div>
                    <ProgressBar
                      value={progressPercentage(item.value, item.target)}
                      tone="info"
                      ariaLabel={`${item.label} progress`}
                    />
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" href="/writing/drills">
                  View drills
                </Button>
                <Button size="sm" variant="ghost" href="/writing">
                  Plan guidance
                </Button>
              </div>
            </Card>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card id="continue-drafts" className="card-surface flex flex-col gap-6 p-6 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Continue drafts</h2>
                <p className="text-sm text-muted-foreground">Pick up where you left off with autosaved work.</p>
              </div>
              <Badge variant="soft" tone="default" size="sm">
                {drafts.length} active
              </Badge>
            </div>
            {drafts.length === 0 ? (
              <EmptyState
                title="No active drafts"
                description="Start a new attempt or revisit a scored attempt to launch a redraft."
              />
            ) : (
              <ul className="space-y-4">
                {drafts.map((attempt) => (
                  <li
                    key={attempt.id}
                    className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/70 p-5 shadow-sm transition-all hover:-translate-y-0.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{attempt.promptTopic}</p>
                        <p className="text-xs text-muted-foreground">Updated {formatDateTime(attempt.updatedAt)}</p>
                      </div>
                      <Badge variant="soft" tone="info" size="sm" className="capitalize">
                        {attempt.taskType === 'task1' ? 'Task 1' : 'Task 2'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                      <span>{attempt.wordCount} words saved</span>
                      <span>{statusLabel[attempt.status]}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="primary" href={`/writing/${attempt.promptSlug}?attemptId=${attempt.id}`}>
                        Resume draft
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card id="recent-attempts" className="card-surface flex flex-col gap-6 p-6 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Recent attempts</h2>
                <p className="text-sm text-muted-foreground">See what you submitted recently and track your scores.</p>
              </div>
              <Badge variant="soft" tone="default" size="sm">
                Last 6
              </Badge>
            </div>
            {recent.length === 0 ? (
              <EmptyState
                title="No attempts yet"
                description="Submit an essay to unlock AI feedback and trend tracking."
              />
            ) : (
              <ul className="space-y-4">
                {recent.map((attempt) => (
                  <li
                    key={attempt.id}
                    className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/70 p-5 shadow-sm transition-all hover:-translate-y-0.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{attempt.promptTopic}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(attempt.updatedAt)}</p>
                      </div>
                      <Badge variant="soft" tone={attempt.status === 'scored' ? 'success' : 'info'} size="sm">
                        {statusLabel[attempt.status]}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                      <span>{attempt.wordCount} words</span>
                      {attempt.overallBand ? (
                        <span className="font-semibold text-foreground">Band {attempt.overallBand.toFixed(1)}</span>
                      ) : (
                        <span>Awaiting score</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" href={`/writing/${attempt.promptSlug}?attemptId=${attempt.id}`}>
                        View details
                      </Button>
                      {attempt.hasFeedback && (
                        <Button size="sm" variant="ghost" href={`/writing/review/${attempt.id}`}>
                          Review feedback
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        <Card className="card-surface flex flex-col gap-6 p-6 sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Boost your next attempt</h2>
              <p className="text-sm text-muted-foreground">
                Layer drills, reviews, and mock feedback to build a sharper writing routine.
              </p>
            </div>
            <Badge variant="soft" tone="info" size="sm">
              Curated resources
            </Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Link
              href="/writing/drills"
              className="group flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/60 p-4 transition hover:border-primary/60 hover:bg-card"
            >
              <span className="text-sm font-semibold text-foreground">Skill drills</span>
              <span className="text-sm text-muted-foreground">
                Target coherence, task achievement, and grammar with 10-minute micro drills.
              </span>
              <span className="mt-auto text-sm font-medium text-primary group-hover:underline">Visit drills</span>
            </Link>
            <Link
              href="/writing/reviews"
              className="group flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/60 p-4 transition hover:border-primary/60 hover:bg-card"
            >
              <span className="text-sm font-semibold text-foreground">AI reviews</span>
              <span className="text-sm text-muted-foreground">
                Compare attempts, highlight improvements, and plan your next rewrite.
              </span>
              <span className="mt-auto text-sm font-medium text-primary group-hover:underline">Open reviews</span>
            </Link>
            <Link
              href="/writing/drills?tab=mocks"
              className="group flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/60 p-4 transition hover:border-primary/60 hover:bg-card"
            >
              <span className="text-sm font-semibold text-foreground">Mock library</span>
              <span className="text-sm text-muted-foreground">
                Revisit scored mocks, analyse feedback themes, and schedule your next redraft.
              </span>
              <span className="mt-auto text-sm font-medium text-primary group-hover:underline">Browse mocks</span>
            </Link>
          </div>
        </Card>
      </div>
    </Container>
  );
};

const mapPromptRow = (
  row: Database['public']['Tables']['writing_prompts']['Row'],
): PromptCard => {
  const outline = (row.outline_json ?? null) as { summary?: unknown } | null;
  const summaryValue = typeof outline?.summary === 'string' ? outline.summary : null;

  return {
    id: row.id,
    slug: row.slug,
    topic: row.topic,
    taskType: row.task_type as WritingTaskType,
    difficulty: row.difficulty ?? 2,
    outlineSummary: summaryValue,
  };
};

const mapAttemptRow = (
  row: Database['public']['Tables']['writing_attempts']['Row'] & {
    prompt: Pick<Database['public']['Tables']['writing_prompts']['Row'], 'slug' | 'topic'> | null;
  },
): AttemptSummary => ({
  id: row.id,
  promptSlug: row.prompt?.slug ?? 'prompt',
  promptTopic: row.prompt?.topic ?? 'Prompt',
  status: row.status,
  updatedAt: row.updated_at,
  wordCount: row.word_count ?? 0,
  taskType: row.task_type as WritingTaskType,
  overallBand: row.overall_band,
  hasFeedback: !!row.feedback_json,
});

export const getServerSideProps: GetServerSideProps<PageProps> = withPlanPage('free')(async (ctx) => {
  const supabase = getServerClient(ctx.req as any, ctx.res as any);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      redirect: {
        destination: '/welcome?from=/writing',
        permanent: false,
      },
    };
  }

  const { data: promptRows } = await supabase
    .from('writing_prompts')
    .select('id, slug, topic, task_type, difficulty, outline_json')
    .order('difficulty', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(12);

  const { data: attemptRows } = await supabase
    .from('writing_attempts')
    .select('id, prompt_id, status, updated_at, word_count, overall_band, task_type, feedback_json, writing_prompts (slug, topic)')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(12);

  const prompts = (promptRows ?? []).map(mapPromptRow);
  const attempts = (attemptRows ?? []).map((row) =>
    mapAttemptRow({
      ...row,
      prompt: row.writing_prompts as Pick<Database['public']['Tables']['writing_prompts']['Row'], 'slug' | 'topic'> | null,
    }),
  );

  const drafts = attempts.filter((attempt) => attempt.status !== 'scored');
  const recent = attempts.slice(0, 6);

  const { data: readinessRow } = await supabase
    .from('writing_readiness')
    .select('status, gates_json')
    .eq('user_id', user.id)
    .order('window_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  const gates = (readinessRow?.gates_json ?? null) as { missing?: unknown } | null;
  const readiness: ReadinessSummary | null = readinessRow
    ? {
        pass: readinessRow.status === 'pass',
        missing:
          readinessRow.status === 'pass'
            ? []
            : Array.isArray(gates?.missing)
            ? ((gates?.missing as string[]) ?? [])
            : [],
      }
    : null;

  const planWindowStart = readinessRow?.window_start ?? new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const planWindowEnd = readinessRow?.window_end ?? null;

  const [{ count: planDrillsCount }, { count: redraftCount }, { count: mockCount }] = await Promise.all([
    supabase
      .from('writing_drill_events')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('completed_at', planWindowStart),
    supabase
      .from('writing_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .not('version_of', 'is', null)
      .gte('created_at', planWindowStart),
    supabase
      .from('writing_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('version_of', null)
      .eq('status', 'scored')
      .gte('created_at', planWindowStart),
  ]);

  const [{ data: profileRow }, { data: lastMicroPrompt }] = await Promise.all([
    supabase
      .from('profiles')
      .select('notification_channels, whatsapp_opt_in')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('writing_notification_events')
      .select('created_at, channel')
      .eq('user_id', user.id)
      .eq('type', 'micro_prompt')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const microPromptSeed = getDailyMicroPrompt();
  const microChannels = ensureNotificationChannels(profileRow?.notification_channels ?? []);
  const microAlreadySent = !shouldSendMicroPromptToday(lastMicroPrompt?.created_at ?? null);
  const retakeReminder = buildRetakeReminder(
    {
      windowStart: planWindowStart,
      windowEnd: planWindowEnd,
      redraftsCompleted: redraftCount ?? 0,
      drillsCompleted: planDrillsCount ?? 0,
      mocksCompleted: mockCount ?? 0,
    },
    RETAKE_PLAN_TARGETS,
  );

  return {
    props: {
      prompts,
      drafts,
      recent,
      readiness,
      plan: {
        windowStart: planWindowStart,
        windowEnd: planWindowEnd,
        redraftsCompleted: redraftCount ?? 0,
        drillsCompleted: planDrillsCount ?? 0,
        mocksCompleted: mockCount ?? 0,
      },
      microPrompt: {
        message: microPromptSeed.message,
        lastSentAt: lastMicroPrompt?.created_at ?? null,
        channels: microChannels,
        canSendWhatsApp: microChannels.includes('whatsapp') && Boolean(profileRow?.whatsapp_opt_in),
        alreadySentToday: microAlreadySent,
        retakeReminder,
      },
    },
  };
});

export default WritingDashboard;
