import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GetServerSideProps } from 'next';

import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { EmptyState } from '@/components/design-system/EmptyState';
import { Icon } from '@/components/design-system/Icon';
import { Input } from '@/components/design-system/Input';
import { Select } from '@/components/design-system/Select';
import { Separator } from '@/components/design-system/Separator';
import { WritingLayout } from '@/layouts/WritingLayout';
import { withPlanPage } from '@/lib/withPlanPage';
import { getServerClient } from '@/lib/supabaseServer';
import type { PlanId } from '@/types/pricing';
import { hasPlan } from '@/lib/planAccess';
import type { PromptCard } from '@/types/writing-dashboard';
import { mapPromptRow } from '@/lib/writing/mappers';
import type { WritingTaskType } from '@/lib/writing/schemas';

const difficultyLabel = (value: number) => {
  if (value <= 1) return 'Beginner';
  if (value === 2) return 'Intermediate';
  if (value === 3) return 'Upper-intermediate';
  if (value === 4) return 'Advanced';
  return 'Band 8+';
};

const difficultyOptions = [1, 2, 3, 4, 5] as const;
const countOptions = [1, 3, 5] as const;

const sortPromptCards = (items: PromptCard[]) =>
  [...items].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (aTime !== bTime) {
      return bTime - aTime;
    }
    const diffDelta = a.difficulty - b.difficulty;
    if (diffDelta !== 0) {
      return diffDelta;
    }
    return a.topic.localeCompare(b.topic);
  });

const planLibraryLimit: Record<PlanId, number> = {
  free: 12,
  starter: 100,
  booster: 500,
  master: 500,
};

const planLibraryCopy: Record<PlanId, string> = {
  free: 'Preview a handful of prompts and upgrade to unlock full filters and AI tools.',
  starter: 'Seedling members access the latest 100 prompts with full filtering.',
  booster: 'Rocket unlocks 500 prompts with detailed outlines and metadata.',
  master: 'Owl includes the full 500 prompt vault and on-demand AI generation.',
};

interface LibraryPageProps {
  prompts: PromptCard[];
  total: number;
  __plan: PlanId;
}

const WritingPromptLibrary = ({ prompts, total, __plan }: LibraryPageProps) => {
  const [promptLibrary, setPromptLibrary] = useState<PromptCard[]>(() =>
    sortPromptCards(prompts.map((prompt) => ({ ...prompt, source: prompt.source ?? 'library' }))),
  );
  useEffect(() => {
    setPromptLibrary(sortPromptCards(prompts.map((prompt) => ({ ...prompt, source: prompt.source ?? 'library' }))));
  }, [prompts]);

  const [searchTerm, setSearchTerm] = useState('');
  const [taskFilter, setTaskFilter] = useState<'all' | WritingTaskType>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | number>('all');
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [generatorMessage, setGeneratorMessage] = useState<string | null>(null);
  const [generatorError, setGeneratorError] = useState<string | null>(null);
  const [generatorLoading, setGeneratorLoading] = useState(false);
  const [generatorOptions, setGeneratorOptions] = useState({
    count: 3 as 1 | 3 | 5,
    task: 'task2' as WritingTaskType,
    difficulty: 3,
    theme: '',
    style: '',
  });

  const maxPrompts = planLibraryLimit[__plan] ?? 100;
  const aiUnlocked = hasPlan(__plan, 'master');
  const rocketUnlocked = hasPlan(__plan, 'booster');
  const planCopy = planLibraryCopy[__plan] ?? planLibraryCopy.free;

  const filteredPrompts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return promptLibrary.filter((prompt) => {
      if (taskFilter !== 'all' && prompt.taskType !== taskFilter) {
        return false;
      }
      if (difficultyFilter !== 'all' && prompt.difficulty !== difficultyFilter) {
        return false;
      }
      if (query) {
        const haystack = `${prompt.topic} ${prompt.outlineSummary ?? ''} ${(prompt.outlineItems ?? []).join(' ')}`.toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [difficultyFilter, promptLibrary, searchTerm, taskFilter]);

  const hasFiltersActive = searchTerm.trim().length > 0 || taskFilter !== 'all' || difficultyFilter !== 'all';

  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setTaskFilter('all');
    setDifficultyFilter('all');
  }, []);

  const handleRefreshPrompts = useCallback(async () => {
    setIsRefreshing(true);
    setLibraryError(null);
    setAnnouncement('Refreshing prompt library…');
    try {
      const response = await fetch(`/api/writing/prompts?limit=${maxPrompts}`);
      const payload = (await response.json()) as
        | { ok: true; prompts: PromptCard[] }
        | { ok: false; error: string };

      if (!response.ok || !('ok' in payload) || !payload.ok) {
        const reason = 'error' in payload ? payload.error : 'Unable to refresh prompts';
        throw new Error(reason);
      }

      const mapped = payload.prompts.map((prompt) => ({
        ...prompt,
        source: prompt.source ?? 'library',
      }));
      setPromptLibrary(sortPromptCards(mapped));
      setAnnouncement(`Prompt library refreshed. Showing ${mapped.length} prompt${mapped.length === 1 ? '' : 's'}.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to refresh prompts';
      setLibraryError(message);
      setAnnouncement(message);
    } finally {
      setIsRefreshing(false);
    }
  }, [maxPrompts]);

  const handleGeneratePrompts = useCallback(
    async (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      if (!aiUnlocked) {
        setGeneratorError('Upgrade to Owl to generate new prompts on demand.');
        return;
      }
      setGeneratorError(null);
      setGeneratorMessage(null);
      setGeneratorLoading(true);
      setAnnouncement('Generating new prompts…');
      try {
        const response = await fetch('/api/ai/writing/prompts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            count: generatorOptions.count,
            task: generatorOptions.task,
            difficulty: generatorOptions.difficulty,
            theme: generatorOptions.theme.trim() || undefined,
            style: generatorOptions.style.trim() || undefined,
          }),
        });
        const payload = (await response.json()) as
          | { ok: true; prompts: PromptCard[] }
          | { ok: false; error: string };
        if (!response.ok || !('ok' in payload) || !payload.ok) {
          const reason = 'error' in payload ? payload.error : 'Unable to generate prompts';
          throw new Error(reason);
        }

        const generated = payload.prompts.map((prompt) => ({
          ...prompt,
          source: prompt.source ?? 'generated',
        }));

        setPromptLibrary((prev) => {
          const existingIds = new Set(prev.map((item) => item.id));
          const deduped = generated.filter((item) => !existingIds.has(item.id));
          const merged = [...deduped, ...prev];
          return sortPromptCards(merged).slice(0, maxPrompts);
        });

        const addedCount = generated.length;
        setGeneratorMessage(`Added ${addedCount} new prompt${addedCount === 1 ? '' : 's'} to your library.`);
        setAnnouncement(`Added ${addedCount} new prompt${addedCount === 1 ? '' : 's'} to your library.`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to generate prompts';
        setGeneratorError(message);
        setAnnouncement(message);
      } finally {
        setGeneratorLoading(false);
      }
    },
    [aiUnlocked, generatorOptions, maxPrompts],
  );

  return (
    <WritingLayout plan={__plan} current="library">
      <div aria-live="polite" role="status" className="sr-only">
        {announcement}
      </div>
      <Card className="card-surface flex flex-col gap-6 p-6 sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-foreground">Prompt library</h2>
            <p className="text-sm text-muted-foreground">
              Filter writing prompts by task and difficulty, then jump straight into the studio.
            </p>
          </div>
          <Badge variant="soft" tone="default" size="sm">
            {filteredPrompts.length} shown · cap {maxPrompts}
          </Badge>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <Input
              label="Search"
              variant="subtle"
              size="sm"
              placeholder="Find a topic"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              leftSlot={<Icon name="search" size={16} />}
            />
            <Select
              label="Task"
              value={taskFilter}
              onChange={(event) => setTaskFilter(event.target.value as 'all' | WritingTaskType)}
              size="sm"
              variant="subtle"
            >
              <option value="all">All tasks</option>
              <option value="task1">Task 1</option>
              <option value="task2">Task 2</option>
            </Select>
            <Select
              label="Difficulty"
              value={difficultyFilter === 'all' ? 'all' : String(difficultyFilter)}
              onChange={(event) => {
                const value = event.target.value;
                setDifficultyFilter(value === 'all' ? 'all' : Number(value));
              }}
              size="sm"
              variant="subtle"
            >
              <option value="all">All levels</option>
              {difficultyOptions.map((option) => (
                <option key={option} value={option}>
                  {difficultyLabel(option)}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={resetFilters} disabled={!hasFiltersActive}>
              Clear
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRefreshPrompts}
              loading={isRefreshing}
              leadingIcon={<Icon name="refresh-ccw" size={16} />}
            >
              Refresh
            </Button>
          </div>
        </div>

        {libraryError && <p className="text-sm text-danger">{libraryError}</p>}

        <p className="text-xs text-muted-foreground">{planCopy}</p>

        {filteredPrompts.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredPrompts.map((prompt) => (
              <Card
                key={prompt.id}
                className="flex h-full flex-col gap-5 rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/50"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Badge variant="soft" tone="info" size="sm" className="capitalize">
                      {prompt.taskType === 'task1' ? 'Task 1' : 'Task 2'}
                    </Badge>
                    {prompt.source === 'generated' && (
                      <Badge variant="soft" tone="primary" size="sm">
                        AI
                      </Badge>
                    )}
                  </div>
                  <Badge variant="soft" tone="default" size="sm">
                    {difficultyLabel(prompt.difficulty)}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">{prompt.topic}</h3>
                  {prompt.outlineSummary && <p className="line-clamp-4 text-sm text-muted-foreground">{prompt.outlineSummary}</p>}
                  {rocketUnlocked && prompt.outlineItems && prompt.outlineItems.length > 0 && (
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {prompt.outlineItems.slice(0, 3).map((item, index) => (
                        <li key={`${prompt.id}-outline-${index}`} className="flex items-start gap-2">
                          <Icon name="check" size={12} className="mt-0.5 text-primary" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {rocketUnlocked && prompt.createdAt && (
                    <p className="text-xs text-muted-foreground">
                      Updated {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(prompt.createdAt))}
                    </p>
                  )}
                </div>
                <div className="mt-auto flex flex-wrap gap-2">
                  <Button size="sm" variant="primary" href={`/writing/${prompt.slug}`}>
                    Start
                  </Button>
                  <Button size="sm" variant="outline" href={`/writing/${prompt.slug}?preview=1`}>
                    View
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No prompts match"
            description="Try adjusting your filters or clearing the search to browse the full library."
          />
        )}
      </Card>

      <Card className="card-surface flex flex-col gap-6 p-6 sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-foreground">AI prompt generator</h2>
            <p className="text-sm text-muted-foreground">
              Craft fresh prompts tailored to your focus area. New prompts appear at the top of your library instantly.
            </p>
          </div>
          <Badge variant="soft" tone={aiUnlocked ? 'success' : 'default'} size="sm">
            {aiUnlocked ? 'Owl unlocked' : 'Owl upgrade required'}
          </Badge>
        </div>
        {!aiUnlocked && (
          <div className="rounded-2xl border border-dashed border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground">
            Upgrade to Owl for unlimited prompt generation with Groq/OpenAI models and curated fallbacks.
          </div>
        )}
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleGeneratePrompts}>
          <Select
            label="How many prompts?"
            value={generatorOptions.count}
            onChange={(event) => setGeneratorOptions((prev) => ({ ...prev, count: Number(event.target.value) as 1 | 3 | 5 }))}
            disabled={!aiUnlocked}
          >
            {countOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
          <Select
            label="Task"
            value={generatorOptions.task}
            onChange={(event) => setGeneratorOptions((prev) => ({ ...prev, task: event.target.value as WritingTaskType }))}
            disabled={!aiUnlocked}
          >
            <option value="task1">Task 1</option>
            <option value="task2">Task 2</option>
          </Select>
          <Select
            label="Difficulty"
            value={String(generatorOptions.difficulty)}
            onChange={(event) =>
              setGeneratorOptions((prev) => ({ ...prev, difficulty: Number(event.target.value) as typeof prev.difficulty }))
            }
            disabled={!aiUnlocked}
          >
            {difficultyOptions.map((option) => (
              <option key={option} value={option}>
                {difficultyLabel(option)}
              </option>
            ))}
          </Select>
          <Input
            label="Theme (optional)"
            placeholder="Sustainability, public health, …"
            value={generatorOptions.theme}
            onChange={(event) => setGeneratorOptions((prev) => ({ ...prev, theme: event.target.value }))}
            disabled={!aiUnlocked}
          />
          <Input
            label="Style hints (optional)"
            placeholder="Formal tone, emphasise comparisons, …"
            value={generatorOptions.style}
            onChange={(event) => setGeneratorOptions((prev) => ({ ...prev, style: event.target.value }))}
            className="md:col-span-2"
            disabled={!aiUnlocked}
          />
          <div className="md:col-span-2 flex flex-wrap gap-3">
            <Button type="submit" variant="primary" disabled={!aiUnlocked} loading={generatorLoading}>
              Generate prompts
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                setGeneratorOptions({
                  count: 3 as 1 | 3 | 5,
                  task: 'task2',
                  difficulty: 3,
                  theme: '',
                  style: '',
                })
              }
              disabled={!aiUnlocked || generatorLoading}
            >
              Reset form
            </Button>
          </div>
        </form>
        {generatorError && <p className="text-sm text-danger">{generatorError}</p>}
        {generatorMessage && <p className="text-sm text-success">{generatorMessage}</p>}
        <Separator />
        <p className="text-xs text-muted-foreground">
          Generated prompts are stored in your personal library. Refresh above to ensure filters include the latest additions.
        </p>
      </Card>
    </WritingLayout>
  );
};

export const getServerSideProps: GetServerSideProps<LibraryPageProps> = withPlanPage('starter')(async (ctx) => {
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

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('plan_id')
    .eq('id', user.id)
    .maybeSingle();

  const planId = (profileRow?.plan_id as PlanId | undefined) ?? 'free';
  const limit = planLibraryLimit[planId] ?? 100;

  const { data: promptRows, count } = await supabase
    .from('writing_prompts')
    .select('id, slug, topic, task_type, difficulty, outline_json, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(limit);

  const prompts = (promptRows ?? []).map(mapPromptRow);

  return {
    props: {
      prompts,
      total: Math.min(count ?? prompts.length, limit),
    },
  } as any;
});

export default WritingPromptLibrary;
