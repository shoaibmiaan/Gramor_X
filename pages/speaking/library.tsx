import { useCallback, useMemo, useState } from 'react';
import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import useSWR from 'swr';
import { useRouter } from 'next/router';

import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Container } from '@/components/design-system/Container';
import { EmptyState } from '@/components/design-system/EmptyState';
import { SectionLabel } from '@/components/design-system/SectionLabel';
import PromptCard from '@/components/speaking/PromptCard';
import SpeakingFilterBar, { type PromptFilters } from '@/components/speaking/SpeakingFilterBar';
import { track } from '@/lib/analytics/track';
import { getServerClient } from '@/lib/supabaseServer';
import { coercePlanId, type PlanId } from '@/types/pricing';
import type { PromptRecord, PromptSearchResponse } from '@/types/speakingPrompts';

const PAGE_SIZE = 20;

type PageProps = {
  initialPrompts: PromptRecord[];
  initialTotal: number;
  initialPlan: PlanId;
  signedIn: boolean;
  initialBookmarkedIds: string[];
  initialFilters: PromptFilters;
  initialPage: number;
};

const fetcher = async (url: string): Promise<PromptSearchResponse> => {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    const info = await res.json().catch(() => ({}));
    throw new Error(info.error ?? `Failed to load prompts (${res.status})`);
  }
  return (await res.json()) as PromptSearchResponse;
};

export default function SpeakingLibraryPage({
  initialPrompts,
  initialTotal,
  initialPlan,
  signedIn,
  initialBookmarkedIds,
  initialFilters,
  initialPage,
}: PageProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<PromptFilters>(initialFilters);
  const [page, setPage] = useState(initialPage);
  const [randomPrompt, setRandomPrompt] = useState<PromptRecord | null>(null);
  const [randomLoading, setRandomLoading] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(
    () => new Set(initialBookmarkedIds),
  );

  const searchParams = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.part !== 'all') params.set('part', filters.part);
    if (filters.difficulty !== 'all') params.set('difficulty', filters.difficulty);
    if (filters.tag) params.set('tags', filters.tag);
    if (filters.bookmarkedOnly) params.set('bookmarked', '1');
    params.set('page', String(page));
    params.set('pageSize', String(PAGE_SIZE));
    return params.toString();
  }, [filters, page]);

  const swrKey = useMemo(() => `/api/speaking/prompts/search?${searchParams}`, [searchParams]);

  const fallbackData = useMemo<PromptSearchResponse>(
    () => ({ items: initialPrompts, total: initialTotal, page: initialPage, pageSize: PAGE_SIZE }),
    [initialPrompts, initialTotal, initialPage],
  );

  const { data, error, isLoading, mutate } = useSWR<PromptSearchResponse>(swrKey, fetcher, {
    fallbackData,
    revalidateOnFocus: false,
  });

  const total = data?.total ?? initialTotal;
  const items = data?.items ?? initialPrompts;
  const hasNext = page * PAGE_SIZE < total;
  const hasPrev = page > 1;

  const loginHref = router.asPath || '/speaking/library';

  const handleFiltersChange = (next: PromptFilters) => {
    setFilters(next);
    setPage(1);
    setRandomPrompt(null);
  };

  const handleBookmarkChange = (promptId: string, bookmarked: boolean) => {
    setBookmarkedIds((current) => {
      const next = new Set(current);
      if (bookmarked) {
        next.add(promptId);
      } else {
        next.delete(promptId);
      }
      return next;
    });

    mutate(
      (current) =>
        current
          ? {
              ...current,
              items: current.items.map((item) =>
                item.id === promptId ? { ...item, bookmarked } : item,
              ),
            }
          : current,
      false,
    );
  };

  const handleRandom = useCallback(async () => {
    setRandomLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.part !== 'all') params.set('part', filters.part);
      if (filters.difficulty !== 'all') params.set('difficulty', filters.difficulty);
      if (filters.tag) {
        const firstTag = filters.tag.split(',').map((tag) => tag.trim())[0];
        if (firstTag) params.set('tag', firstTag);
      }
      const res = await fetch(`/api/speaking/prompts/random?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const info = await res.json().catch(() => ({}));
        throw new Error(info.error ?? 'Unable to fetch random prompt');
      }
      const payload = (await res.json()) as { item: PromptRecord | null };
      if (payload.item) {
        setRandomPrompt(payload.item);
        track('prompt_randomized', {
          prompt_slug: payload.item.slug,
          part: payload.item.part,
          difficulty: payload.item.difficulty,
          tags: payload.item.tags.join(','),
          plan: initialPlan,
        });
      } else {
        setRandomPrompt(null);
      }
    } catch (_err) {
      setRandomPrompt(null);
    } finally {
      setRandomLoading(false);
    }
  }, [filters.difficulty, filters.part, filters.tag, initialPlan]);

  return (
    <>
      <Head>
        <title>Speaking Prompt Library | Gramor X</title>
      </Head>
      <section className="py-20">
        <Container className="space-y-10">
          <div className="max-w-3xl space-y-4">
            <Badge variant="accent">New</Badge>
            <h1 className="font-slab text-display leading-tight">Speaking Prompt Library</h1>
            <p className="text-body text-grayish">
              Filter IELTS-style topics across parts 1–3, interview scenarios, and profession-specific drills.
              Bookmark favourites and launch straight into mocks or the Pronunciation Coach.
            </p>
          </div>

          <SpeakingFilterBar
            value={filters}
            onChange={handleFiltersChange}
            onRandomClick={handleRandom}
            randomLoading={randomLoading}
            plan={initialPlan}
            signedIn={signedIn}
          />

          {randomPrompt && (
            <div className="space-y-3">
              <SectionLabel label="Random recommendation" />
              <PromptCard
                prompt={{ ...randomPrompt, bookmarked: bookmarkedIds.has(randomPrompt.id) }}
                signedIn={signedIn}
                plan={initialPlan}
                loginHref={loginHref}
                onBookmarkChange={handleBookmarkChange}
              />
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {items.map((prompt) => (
              <PromptCard
                key={prompt.id}
                prompt={{ ...prompt, bookmarked: bookmarkedIds.has(prompt.id) }}
                signedIn={signedIn}
                plan={initialPlan}
                loginHref={loginHref}
                onBookmarkChange={handleBookmarkChange}
              />
            ))}
          </div>

          {items.length === 0 && !isLoading && !error && (
            <EmptyState
              title="No prompts found"
              description="Try adjusting your filters or exploring a different difficulty."
            />
          )}

          {error && (
            <p className="text-danger">
              {error instanceof Error ? error.message : 'Unable to load prompts'}
            </p>
          )}

          <div className="flex items-center justify-between border-t border-border/40 pt-6">
            <Button
              type="button"
              variant="secondary"
              className="rounded-ds-xl"
              disabled={!hasPrev}
              onClick={() => {
                if (!hasPrev) return;
                setPage((current) => {
                  const nextPage = Math.max(1, current - 1);
                  setRandomPrompt(null);
                  return nextPage;
                });
              }}
            >
              Previous
            </Button>
            <span className="text-small text-mutedText">
              Page {page} · {total} prompts
            </span>
            <Button
              type="button"
              variant="secondary"
              className="rounded-ds-xl"
              disabled={!hasNext}
              onClick={() => {
                if (!hasNext) return;
                setPage((current) => {
                  const nextPage = current + 1;
                  setRandomPrompt(null);
                  return nextPage;
                });
              }}
            >
              Next
            </Button>
          </div>
        </Container>
      </section>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const supabase = getServerClient(ctx.req as any, ctx.res as any);
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;

  const initialFilters: PromptFilters = {
    q: typeof ctx.query.q === 'string' ? ctx.query.q : '',
    part: typeof ctx.query.part === 'string' && ['p1', 'p2', 'p3', 'interview', 'scenario'].includes(ctx.query.part)
      ? (ctx.query.part as PromptFilters['part'])
      : 'all',
    difficulty:
      typeof ctx.query.difficulty === 'string' && ['B1', 'B2', 'C1', 'C2'].includes(ctx.query.difficulty)
        ? (ctx.query.difficulty as PromptFilters['difficulty'])
        : 'all',
    tag: typeof ctx.query.tags === 'string' ? ctx.query.tags : '',
    bookmarkedOnly: ctx.query.bookmarked === '1' || ctx.query.bookmarked === 'true',
  };

  const initialPageRaw = Number.parseInt(String(ctx.query.page ?? '1'), 10);
  const initialPage = Number.isFinite(initialPageRaw) && initialPageRaw > 0 ? initialPageRaw : 1;

  let plan: PlanId = 'free';
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('membership')
      .eq('user_id', user.id)
      .maybeSingle();
    plan = coercePlanId(profile?.membership ?? undefined);
  }

  const { data: savedRows } = user
    ? await supabase
        .from('speaking_prompt_saves')
        .select('prompt_id')
        .eq('user_id', user.id)
        .eq('is_bookmarked', true)
    : { data: [] as Array<{ prompt_id: string }>, error: null };

  const bookmarkedIds = (savedRows ?? []).map((row) => row.prompt_id);

  if (initialFilters.bookmarkedOnly && !user) {
    return {
      props: {
        initialPrompts: [],
        initialTotal: 0,
        initialPlan: plan,
        signedIn: false,
        initialBookmarkedIds: [],
        initialFilters,
        initialPage,
      },
    };
  }

  if (initialFilters.bookmarkedOnly && user && bookmarkedIds.length === 0) {
    return {
      props: {
        initialPrompts: [],
        initialTotal: 0,
        initialPlan: plan,
        signedIn: true,
        initialBookmarkedIds: [],
        initialFilters,
        initialPage,
      },
    };
  }

  let queryBuilder = supabase
    .from('speaking_prompts')
    .select('id, slug, part, topic, question, cue_card, followups, difficulty, locale, tags, is_active, created_at', {
      count: 'exact',
    })
    .eq('is_active', true);

  if (initialFilters.part !== 'all') {
    queryBuilder = queryBuilder.eq('part', initialFilters.part);
  }

  if (initialFilters.difficulty !== 'all') {
    queryBuilder = queryBuilder.eq('difficulty', initialFilters.difficulty);
  }

  if (initialFilters.tag) {
    const tagList = initialFilters.tag
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    for (const tag of tagList) {
      queryBuilder = queryBuilder.contains('tags', [tag]);
    }
  }

  if (initialFilters.q) {
    const sanitized = initialFilters.q.replace(/[,%]/g, '').trim();
    if (sanitized) {
      const term = `%${sanitized}%`;
      queryBuilder = queryBuilder.or(`topic.ilike.${term},question.ilike.${term},cue_card.ilike.${term}`);
    }
  }

  if (initialFilters.bookmarkedOnly && bookmarkedIds.length > 0) {
    queryBuilder = queryBuilder.in('id', bookmarkedIds);
  }

  const from = (initialPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, count, error } = await queryBuilder
    .order('created_at', { ascending: false })
    .range(from, to);

  const rows = error ? [] : data ?? [];
  const total = error ? 0 : count ?? rows.length;

  const initialPrompts = rows.map<PromptRecord>((row) => ({
    id: row.id,
    slug: row.slug,
    part: row.part,
    topic: row.topic,
    question: row.question ?? null,
    cueCard: row.cue_card ?? null,
    followups: Array.isArray(row.followups) ? row.followups : [],
    difficulty: row.difficulty,
    locale: row.locale,
    tags: Array.isArray(row.tags) ? row.tags : [],
    isActive: row.is_active,
    createdAt: row.created_at,
    bookmarked: bookmarkedIds.includes(row.id),
  }));

  return {
    props: {
      initialPrompts,
      initialTotal: total,
      initialPlan: plan,
      signedIn: Boolean(user),
      initialBookmarkedIds: bookmarkedIds,
      initialFilters,
      initialPage,
    },
  };
};
