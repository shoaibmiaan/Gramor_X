import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { Icon } from '@/components/design-system/Icon';
import { Container } from '@/components/design-system/Container';
import { Section } from '@/components/design-system/Section';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import { Skeleton } from '@/components/design-system/Skeleton';
import { ProgressBar } from '@/components/design-system/ProgressBar';
import { WritingFilterBar } from '@/components/writing/WritingFilterBar';

const KIND_VALUES = [
  'task1-graph',
  'task1-letter',
  'task2-opinion',
  'task2-discuss',
  'task2-advantages',
  'task2-problem',
] as const;
type Kind = (typeof KIND_VALUES)[number];
type FilterKey = 'all' | Kind;

const KIND_SET = new Set<string>(KIND_VALUES);
const KIND_LABELS: Record<Kind, string> = {
  'task1-graph': 'Task 1: Graphs/Charts',
  'task1-letter': 'Task 1: Letters',
  'task2-opinion': 'Task 2: Opinion',
  'task2-discuss': 'Task 2: Discuss Both Views',
  'task2-advantages': 'Task 2: Advantages/Disadvantages',
  'task2-problem': 'Task 2: Problem/Solution',
};

function normaliseKind(v: unknown): Kind | null {
  if (typeof v !== 'string') return null;
  const s = v.toLowerCase();
  if (s.startsWith('task1-graph') || s === 'graph' || s === 'chart') return 'task1-graph';
  if (s.startsWith('task1-letter') || s === 'letter') return 'task1-letter';
  if (s.startsWith('task2-opinion') || s === 'opinion') return 'task2-opinion';
  if (s.startsWith('task2-discuss') || s === 'discuss') return 'task2-discuss';
  if (s.startsWith('task2-advantages') || s.includes('adv/disadv')) return 'task2-advantages';
  if (s.startsWith('task2-problem') || s === 'problem') return 'task2-problem';
  return KIND_SET.has(s) ? (s as Kind) : null;
}

function normaliseFilter(v: unknown): FilterKey {
  if (typeof v !== 'string') return 'all';
  const s = v.toLowerCase();
  return s === 'all' ? 'all' : (KIND_SET.has(s) ? (s as Kind) : 'all');
}

function extractTypes(input: unknown): Kind[] {
  const out: Kind[] = [];
  const push = (x: unknown) => {
    const k = normaliseKind(x);
    if (k && !out.includes(k)) out.push(k);
  };
  if (Array.isArray(input)) {
    for (const i of input) {
      if (typeof i === 'string') push(i);
      else if (i && typeof i === 'object') {
        const o = i as any;
        if ('type' in o) push(o.type);
        if ('kind' in o) push(o.kind);
      }
    }
  } else if (input && typeof input === 'object') {
    const o = input as any;
    if (Array.isArray(o.types)) o.types.forEach(push);
    if ('type' in o) push(o.type);
    if ('kind' in o) push(o.kind);
  } else push(input);
  return out;
}

type WritingListItem = {
  slug: string;
  title: string;
  summary?: string | null;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  wordCount: number;
  estMinutes: number;
  types: Kind[];
};

type UserStats = {
  completionRate: number;
  avgScore: number;
  streak: number;
  totalPractices: number;
};

const diffVariant = (d: WritingListItem['difficulty']) =>
  d === 'Easy' ? 'success' : d === 'Medium' ? 'warning' : 'danger';

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const a = [...nums].sort((x, y) => x - y);
  const mid = (a.length - 1) / 2;
  const lo = a[Math.floor(mid)];
  const hi = a[Math.ceil(mid)];
  return Math.round(((lo + hi) / 2) * 10) / 10;
}

function mode<T extends string>(vals: T[]): { value: T | 'Mixed'; count: number } {
  if (!vals.length) return { value: 'Mixed', count: 0 } as any;
  const m = new Map<T, number>();
  for (const v of vals) m.set(v, (m.get(v) ?? 0) + 1);
  let best: T | null = null;
  let c = 0;
  for (const [k, v] of m) if (v > c) { best = k; c = v; }
  const mixed = c < Math.ceil(vals.length / 2);
  return { value: (mixed ? 'Mixed' : (best as T)), count: c };
}

function summarize(items: WritingListItem[]) {
  const diffs = items.map(i => i.difficulty);
  const times = items.map(i => Number.isFinite(i.estMinutes) ? i.estMinutes : 0);
  const words = items.map(i => Number.isFinite(i.wordCount) ? i.wordCount : 0);
  const diffMode = mode(diffs);
  const medianMin = median(times);
  const medianWords = Math.round(median(words));

  const typeCounts = new Map<Kind, number>();
  const distinct = new Set<Kind>();
  for (const i of items) for (const t of i.types) {
    distinct.add(t);
    typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
  }
  let topType: Kind | null = null;
  let tc = 0;
  for (const [k, v] of typeCounts) if (v > tc) { topType = k; tc = v; }
  const distinctN = Math.max(distinct.size, topType ? 1 : 0);
  return {
    diff: diffMode.value,
    medianWords,
    medianMin,
    topTypeLabel: topType ? KIND_LABELS[topType] : 'Types',
    plusN: Math.max(distinctN - 1, 0),
  };
}

export default function WritingListPage() {
  const router = useRouter();
  const activeType = normaliseFilter(router.query.type);
  const [activeTab, setActiveTab] = useState<'practice' | 'dashboard' | 'resources'>('practice');
  const [items, setItems] = useState<WritingListItem[] | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [userStats, setUserStats] = useState<UserStats | null>(null);

  // Gate switch kept: if product runs in "reading-only" mode, block writing tab
  const isReadingOnly = process.env.NEXT_PUBLIC_GATE_MODE === 'reading-only';

  useEffect(() => {
    if (isReadingOnly) return;
    let cancelled = false;

    (async () => {
      try {
        const resp = await fetch('/api/writing/tasks');
        if (!resp.ok) throw new Error(`Failed to load catalog (${resp.status})`);
        const json = await resp.json();
        if (!cancelled) {
          const mapped: WritingListItem[] = (json?.items ?? []).map((item: any) => {
            const types = extractTypes(item?.types ?? item?.questionTypes ?? item?.kinds);
            return {
              slug: String(item.slug),
              title: String(item.title ?? 'Writing Task'),
              summary: item.summary ?? null,
              difficulty: (item.difficulty ?? 'Medium') as WritingListItem['difficulty'],
              wordCount: Number(item.wordCount ?? (types[0]?.startsWith('task1-') ? 150 : 250)),
              estMinutes: Number(item.estMinutes ?? (types[0]?.startsWith('task1-') ? 20 : 40)),
              types: types.length > 0 ? types : (['task2-opinion'] as Kind[]),
            };
          });
          setItems(mapped);
          setError(undefined);
        }
      } catch (e: any) {
        if (!cancelled) {
          setItems([]);
          setError(e?.message || 'Failed to load');
        }
      }
    })();

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token && !cancelled && !isReadingOnly) {
      (async () => {
        try {
          const r = await fetch('/api/user/writing-stats', { headers: { Authorization: `Bearer ${token}` } });
          if (r.ok) setUserStats(await r.json());
        } catch {
          /* ignore */
        }
      })();
    }

    return () => { cancelled = true; };
  }, [isReadingOnly]);

  const filtered = useMemo(() => {
    if (!items) return [] as WritingListItem[];
    if (activeType === 'all') return items;
    return items.filter(i => i.types.includes(activeType as Kind));
  }, [items, activeType]);

  const summary = useMemo(() => summarize(filtered), [filtered]);

  // --- Conditional render AFTER hooks ---
  if (isReadingOnly) {
    return (
      <main className="py-24">
        <Container>
          <Card className="p-8 text-center">
            <h1 className="text-h3 font-semibold">Writing module is coming soon</h1>
            <p className="mt-2 text-muted-foreground">
              Join the waitlist to get early (free) access when it unlocks.
            </p>
            <div className="mt-5">
              <Link href="/waitlist">
                <Button variant="primary" className="rounded-ds-xl">Join the waitlist</Button>
              </Link>
            </div>
          </Card>
        </Container>
      </main>
    );
  }

  // ========== MAIN UI ==========
  return (
    <>
      <Section id="writing">
        <Container>
          {/* Header */}
          <div className="mx-auto mb-8 max-w-3xl text-center">
            <Badge variant="info" size="sm" className="mb-4 inline-flex items-center gap-2">
              <Icon name="Edit3" className="text-electricBlue" />
              Writing vault
            </Badge>
            <h1 className="font-slab text-display mb-2 text-gradient-primary">IELTS Writing</h1>
            <p className="text-muted-foreground">Compact practice list. Start fast—no clutter.</p>
            <div className="mt-5">
              <a href="#practice" className="inline-flex">
                <Button variant="primary" size="lg" className="rounded-ds-xl">Start practicing</Button>
              </a>
            </div>
          </div>

          {/* Tabs */}
          <div role="tablist" aria-label="Writing sections"
               className="mx-auto mb-8 max-w-3xl rounded-ds-2xl p-1 bg-card border border-border flex">
            {['practice', 'dashboard', 'resources'].map(tab => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                className={`flex-1 rounded-ds-xl px-4 py-2 text-sm transition-colors ${
                  activeTab === tab ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
                onClick={() => setActiveTab(tab as any)}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  {tab === 'practice' && <><Icon name="Target" size={16}/>Practice Tasks</>}
                  {tab === 'dashboard' && <><Icon name="Trophy" size={16}/>Full Dashboard</>}
                  {tab === 'resources' && <><Icon name="BookMarked" size={16}/>Tips & Resources</>}
                </span>
              </button>
            ))}
          </div>

          {/* === PRACTICE TAB === */}
          {activeTab === 'practice' && (
            <>
              <nav aria-label="Filter writing tasks" className="mb-4"><WritingFilterBar /></nav>
              <div className="mb-6">
                <Card className="px-4 py-3 border-border/60 bg-white/70 backdrop-blur dark:bg-dark/70">
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="text-muted-foreground">Typical for this view:</span>
                    {summary.diff === 'Mixed'
                      ? <Badge variant="info" size="sm">Mixed difficulty</Badge>
                      : <Badge variant={diffVariant(summary.diff as any)} size="sm">{summary.diff}</Badge>}
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Icon name="Clock" size={14}/> {summary.medianWords} words • {summary.medianMin} min
                    </span>
                    <Badge variant="surface" size="sm">
                      {summary.topTypeLabel}{summary.plusN > 0 ? ` +${summary.plusN}` : ''}
                    </Badge>
                    <span className="ml-auto text-xs text-muted-foreground">
                      Showing {filtered.length}{items ? ` / ${items.length}` : ''} tasks
                    </span>
                  </div>
                </Card>
              </div>

              {error && (
                <div className="mb-8" role="alert" aria-live="assertive">
                  <Alert variant="warning" title="Couldn’t load tasks">{error}</Alert>
                </div>
              )}

              {!items ? (
                <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4" aria-label="Loading writing tasks">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Card key={i} className="border-border/60 bg-white/70 backdrop-blur dark:bg-dark/70"
                          interactive padding="md">
                      <Skeleton className="h-5 w-3/4"/>
                      <Skeleton className="mt-4 h-8 w-full"/>
                    </Card>
                  ))}
                </div>
              ) : (
                <>
                  <ul id="practice" role="list"
                      className="grid gap-4 md:grid-cols-3 xl:grid-cols-4"
                      aria-label="Writing tasks">
                    {filtered.map(t => (
                      <li key={t.slug}>
                        <Card className="h-full border-border/60 bg-white/70 shadow-sm backdrop-blur transition hover:-translate-y-[2px] hover:shadow-glow dark:bg-dark/70"
                              interactive padding="md">
                          <h3 className="text-lg font-semibold leading-snug line-clamp-2">{t.title}</h3>
                          <div className="mt-4 flex gap-2">
                            <Link href={`/writing/${t.slug}`} className="flex-1" aria-label={`Start ${t.title}`}>
                              <Button variant="primary" size="sm" className="w-full rounded-ds-xl">Start</Button>
                            </Link>
                            <Link href={`/writing/${t.slug}#preview`} aria-label={`Preview ${t.title}`}>
                              <Button variant="surface" size="sm" className="rounded-ds-xl">Preview</Button>
                            </Link>
                          </div>
                        </Card>
                      </li>
                    ))}
                  </ul>
                  {items && filtered.length === 0 && !error && (
                    <section className="mt-10 p-8 text-center bg-card border border-border rounded-xl"
                             role="status" aria-live="polite">
                      <Icon name="Brain" size={48} className="text-muted-foreground mx-auto mb-3"/>
                      <h2 className="text-h4 font-semibold mb-1">No matches</h2>
                      <p className="text-muted-foreground">Try a different type or check back soon.</p>
                    </section>
                  )}
                </>
              )}
            </>
          )}

          {/* === DASHBOARD TAB === */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <Card className="p-6 border-border/60 bg-white/70 backdrop-blur dark:bg-dark/70">
                <div className="flex items-center justify-between">
                  <h2 className="text-h4 font-semibold flex items-center gap-2">
                    <Icon name="Trophy" /> Your Writing Dashboard
                  </h2>
                  <Link href="/writing/dashboard">
                    <Button variant="surface" size="sm" className="rounded-ds-xl">Open full page</Button>
                  </Link>
                </div>
                {userStats ? (
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{userStats.avgScore}%</div>
                      <div className="text-sm text-muted-foreground">Avg Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{userStats.streak}d</div>
                      <div className="text-sm text-muted-foreground">Streak</div>
                    </div>
                    <div className="flex items-center">
                      <ProgressBar value={userStats.completionRate} aria-label="Completion rate" />
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Sign in and complete a practice to see personalized analytics.
                  </p>
                )}
              </Card>
            </div>
          )}

          {/* === RESOURCES TAB — FULL MODULE GATEWAY === */}
          {activeTab === 'resources' && (
            <div className="space-y-6">
              {/* Gateway: 3 primary entry cards */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="p-6 bg-white/70 backdrop-blur dark:bg-dark/70">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-electricBlue/15 text-electricBlue">
                    <Icon name="BookMarked" />
                  </div>
                  <h3 className="text-xl font-semibold">Tips & Micro-Practice</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    10 focused tips + quick practice. Log attempts; progress saved server-side.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Link href="/writing/resources" className="inline-flex">
                      <Button variant="primary" className="rounded-ds-xl">Open</Button>
                    </Link>
                    <Link href="/writing/resources" className="inline-flex">
                      <Button variant="surface" className="rounded-ds-xl">Micro Practice</Button>
                    </Link>
                  </div>
                </Card>

                <Card className="p-6 bg-white/70 backdrop-blur dark:bg-dark/70">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-electricBlue/15 text-electricBlue">
                    <Icon name="Sparkles" />
                  </div>
                  <h3 className="text-xl font-semibold">AI Insights</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Personalized focus areas and next micro-tasks. Starter+ (admin/teachers bypass).
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Link href="/writing/resources" className="inline-flex">
                      <Button variant="secondary" className="rounded-ds-xl">Open Insights</Button>
                    </Link>
                    <Link
                      href="/pricing/overview?reason=plan_required&need=starter&from=/writing"
                      className="inline-flex"
                    >
                      <Button variant="ghost" className="rounded-ds-xl">See Plans</Button>
                    </Link>
                  </div>
                </Card>

                <Card className="p-6 bg-white/70 backdrop-blur dark:bg-dark/70">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-electricBlue/15 text-electricBlue">
                    <Icon name="Timer" />
                  </div>
                  <h3 className="text-xl font-semibold">Timed Mock</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Jump into a full timed attempt. Build pacing and exam stamina.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Link href="/writing/mock" className="inline-flex">
                      <Button variant="secondary" className="rounded-ds-xl">Begin Mock</Button>
                    </Link>
                  </div>
                </Card>
              </div>

              {/* Downloadables + Core Guides */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="p-6 bg-white/70 backdrop-blur dark:bg-dark/70">
                  <h4 className="text-lg font-semibold">Downloadables</h4>
                  <p className="text-sm text-muted-foreground mt-1">Print-friendly references.</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <Link href="/resources/writing/cheatsheet-grammar.pdf" className="inline-flex">
                      <Button variant="surface">Grammar Cheatsheet</Button>
                    </Link>
                    <Link href="/resources/writing/linking-words.pdf" className="inline-flex">
                      <Button variant="surface">Linking Words Bank</Button>
                    </Link>
                    <Link href="/resources/writing/task2-templates.pdf" className="inline-flex">
                      <Button variant="surface">Task 2 Templates</Button>
                    </Link>
                  </div>
                </Card>

                <Card className="p-6 bg-white/70 backdrop-blur dark:bg-dark/70">
                  <h4 className="text-lg font-semibold">Core Guides</h4>
                  <p className="text-sm text-muted-foreground mt-1">Short, practical explainers.</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <Link href="/writing/learn/task1-overview" className="inline-flex">
                      <Button variant="surface">Task 1 Overview</Button>
                    </Link>
                    <Link href="/writing/learn/task2-structure" className="inline-flex">
                      <Button variant="surface">Task 2 Structure</Button>
                    </Link>
                    <Link href="/writing/learn/coherence" className="inline-flex">
                      <Button variant="surface">Coherence & Cohesion</Button>
                    </Link>
                  </div>
                </Card>
              </div>

              {/* Light “why practice > learning” nudge */}
              <Card className="p-6 bg-white/70 backdrop-blur dark:bg-dark/70">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h4 className="text-lg font-semibold">Practice > Passive Learning</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      We keep guides concise and push you to practice immediately—your progress is logged and surfaced in Insights.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link href="/writing/resources" className="inline-flex">
                      <Button variant="primary" className="rounded-ds-xl">Open Tips & Practice</Button>
                    </Link>
                    <Link href="/writing/mock" className="inline-flex">
                      <Button variant="secondary" className="rounded-ds-xl">Start Timed Mock</Button>
                    </Link>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </Container>
      </Section>
    </>
  );
}
