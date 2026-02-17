// pages/reading/index.tsx
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
import { ReadingFilterBar } from '@/components/reading/ReadingFilterBar';
import ReadingDashboard from '@/components/reading/ReadingDashboard';

const KIND_VALUES = ['tfng', 'mcq', 'matching', 'short'] as const;
type Kind = (typeof KIND_VALUES)[number];
type FilterKey = 'all' | Kind;

const KIND_SET = new Set<string>(KIND_VALUES);
const KIND_LABELS: Record<Kind, string> = {
  tfng: 'True/False/Not Given',
  mcq: 'Multiple Choice',
  matching: 'Matching',
  short: 'Short Answer',
};

function normaliseKind(v: unknown): Kind | null {
  if (typeof v !== 'string') return null;
  const s = v.toLowerCase();
  if (s === 'match' || s.startsWith('matching')) return 'matching';
  if (s === 'ynng' || s.startsWith('tfng')) return 'tfng';
  if (s.startsWith('mcq')) return 'mcq';
  if (s.startsWith('short')) return 'short';
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

type ReadingListItem = {
  slug: string;
  title: string;
  summary?: string | null;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  qCount: number;
  estMinutes: number;
  types: Kind[];
};

type UserStats = {
  completionRate: number;
  avgScore: number;
  streak: number;
  totalPractices: number;
};

const diffVariant = (d: ReadingListItem['difficulty']) =>
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
  let best: T | null = null, c = 0;
  for (const [k, v] of m) if (v > c) { best = k; c = v; }
  const mixed = c < Math.ceil(vals.length / 2);
  return { value: (mixed ? 'Mixed' : (best as T)), count: c };
}
function summarize(items: ReadingListItem[]) {
  const diffs = items.map(i => i.difficulty);
  const times = items.map(i => Number.isFinite(i.estMinutes) ? i.estMinutes : 0);
  const qs = items.map(i => Number.isFinite(i.qCount) ? i.qCount : 0);

  const diffMode = mode(diffs);
  const medianMin = median(times);
  const medianQ = Math.round(median(qs));

  const typeCounts = new Map<Kind, number>();
  const distinct = new Set<Kind>();
  for (const i of items) for (const t of i.types) { distinct.add(t); typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1); }
  let topType: Kind | null = null, tc = 0;
  for (const [k, v] of typeCounts) if (v > tc) { topType = k; tc = v; }
  const distinctN = Math.max(distinct.size, topType ? 1 : 0);
  return {
    diff: diffMode.value,
    medianQ,
    medianMin,
    topTypeLabel: topType ? KIND_LABELS[topType] : 'Types',
    plusN: Math.max(distinctN - 1, 0),
  };
}

export default function ReadingListPage() {
  const router = useRouter();
  const activeType = normaliseFilter(router.query.type);
  const [activeTab, setActiveTab] = useState<'practice' | 'dashboard' | 'resources'>('practice');

  if (process.env.NEXT_PUBLIC_GATE_MODE === 'writing-only') {
    return (
      <main className="py-24">
        <Container>
          <Card className="p-8 text-center">
            <h1 className="text-h3 font-semibold">Reading module is coming soon</h1>
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

  const [items, setItems] = useState<ReadingListItem[] | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [userStats, setUserStats] = useState<UserStats | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const resp = await fetch('/api/reading/tests');
        if (!resp.ok) throw new Error(`Failed to load catalog (${resp.status})`);
        const json = await resp.json();
        if (!cancelled) {
          const mapped: ReadingListItem[] = (json?.items ?? []).map((item: any) => {
            const types = extractTypes(item?.types ?? item?.questionTypes ?? item?.kinds);
            return {
              slug: String(item.slug),
              title: String(item.title ?? 'Reading Passage'),
              summary: item.summary ?? null,
              difficulty: (item.difficulty ?? 'Medium') as ReadingListItem['difficulty'],
              qCount: Number(item.qCount ?? 0),
              estMinutes: Number(item.estMinutes ?? 20),
              types: types.length > 0 ? types : (['mcq'] as Kind[]),
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
    if (token && !cancelled) {
      (async () => {
        try {
          const r = await fetch('/api/user/reading-stats', { headers: { Authorization: `Bearer ${token}` } });
          if (r.ok) setUserStats(await r.json());
        } catch { /* ignore */ }
      })();
    }

    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!items) return [] as ReadingListItem[];
    if (activeType === 'all') return items;
    return items.filter(i => i.types.includes(activeType as Kind));
  }, [items, activeType]);

  const summary = useMemo(() => summarize(filtered), [filtered]);

  return (
    <>
      <Section id="reading">
        <Container>
          <div className="mx-auto mb-8 max-w-3xl text-center">
            <Badge variant="info" size="sm" className="mb-4 inline-flex items-center gap-2">
              <Icon name="BookOpen" className="text-electricBlue" />
              Reading vault
            </Badge>
            <h1 className="font-slab text-display mb-2 text-gradient-primary">IELTS Reading</h1>
            <p className="text-muted-foreground">Compact practice list. Start fast—no clutter.</p>
            <div className="mt-5">
              <a href="#practice" className="inline-flex">
                <Button variant="primary" size="lg" className="rounded-ds-xl">Start practicing</Button>
              </a>
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Reading sections"
            className="mx-auto mb-8 max-w-3xl rounded-ds-2xl p-1 bg-card border border-border flex"
          >
            <button
              role="tab"
              aria-selected={activeTab === 'practice'}
              className={`flex-1 rounded-ds-xl px-4 py-2 text-sm transition-colors ${
                activeTab === 'practice' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
              onClick={() => setActiveTab('practice')}
            >
              <span className="inline-flex items-center justify-center gap-2">
                <Icon name="Target" size={16} />
                Practice Papers
              </span>
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'dashboard'}
              className={`flex-1 rounded-ds-xl px-4 py-2 text-sm transition-colors ${
                activeTab === 'dashboard' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
              onClick={() => setActiveTab('dashboard')}
            >
              <span className="inline-flex items-center justify-center gap-2">
                <Icon name="Trophy" size={16} />
                Full Dashboard
              </span>
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'resources'}
              className={`flex-1 rounded-ds-xl px-4 py-2 text-sm transition-colors ${
                activeTab === 'resources' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
              onClick={() => setActiveTab('resources')}
            >
              <span className="inline-flex items-center justify-center gap-2">
                <Icon name="BookMarked" size={16} />
                Tips & Resources
              </span>
            </button>
          </div>

          {activeTab === 'practice' && (
            <>
              <nav aria-label="Filter reading passages" className="mb-4">
                <ReadingFilterBar />
              </nav>

              <div className="mb-6">
                <Card className="px-4 py-3 border-border/60 bg-white/70 backdrop-blur dark:bg-dark/70">
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="text-muted-foreground">Typical for this view:</span>

                    {summary.diff === 'Mixed' ? (
                      <Badge variant="info" size="sm">Mixed difficulty</Badge>
                    ) : (
                      <Badge variant={diffVariant(summary.diff as any)} size="sm">
                        {summary.diff}
                      </Badge>
                    )}

                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Icon name="Clock" size={14} />
                      {summary.medianQ} Q • {summary.medianMin} min
                    </span>

                    <Badge variant="surface" size="sm">
                      {summary.topTypeLabel}{summary.plusN > 0 ? ` +${summary.plusN}` : ''}
                    </Badge>

                    <span className="ml-auto text-xs text-muted-foreground">
                      Showing {filtered.length}{items ? ` / ${items.length}` : ''} passages
                    </span>
                  </div>
                </Card>
              </div>

              {error && (
                <div className="mb-8" role="alert" aria-live="assertive">
                  <Alert variant="warning" title="Couldn’t load tests">
                    {error}
                  </Alert>
                </div>
              )}

              {!items ? (
                <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4" aria-label="Loading reading passages">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Card
                      key={i}
                      className="border-border/60 bg-white/70 backdrop-blur dark:bg-dark/70"
                      interactive
                      padding="md"
                    >
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="mt-4 h-8 w-full" />
                    </Card>
                  ))}
                </div>
              ) : (
                <>
                  <ul
                    id="practice"
                    role="list"
                    className="grid gap-4 md:grid-cols-3 xl:grid-cols-4"
                    aria-label="Reading passages"
                  >
                    {filtered.map((t) => (
                      <li key={t.slug}>
                        <Card
                          className="h-full border-border/60 bg-white/70 shadow-sm backdrop-blur transition hover:-translate-y-[2px] hover:shadow-glow dark:bg-dark/70"
                          interactive
                          padding="md"
                        >
                          <h3 className="text-lg font-semibold leading-snug line-clamp-2">{t.title}</h3>

                          <div className="mt-4 flex gap-2">
                            <Link href={`/reading/${t.slug}`} className="flex-1" aria-label={`Start ${t.title}`}>
                              <Button variant="primary" size="sm" className="w-full rounded-ds-xl">
                                Start
                              </Button>
                            </Link>
                            <Link href={`/reading/${t.slug}#preview`} aria-label={`Preview ${t.title}`}>
                              <Button variant="surface" size="sm" className="rounded-ds-xl">
                                Preview
                              </Button>
                            </Link>
                          </div>
                        </Card>
                      </li>
                    ))}
                  </ul>

                  {items && filtered.length === 0 && !error && (
                    <section
                      className="mt-10 p-8 text-center bg-card border border-border rounded-xl"
                      role="status"
                      aria-live="polite"
                    >
                      <Icon name="Brain" size={48} className="text-muted-foreground mx-auto mb-3" />
                      <h2 className="text-h4 font-semibold mb-1">No matches</h2>
                      <p className="text-muted-foreground">Try a different type or check back soon.</p>
                    </section>
                  )}
                </>
              )}
            </>
          )}

          {activeTab === 'dashboard' && <ReadingDashboard />}

          {activeTab === 'resources' && (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              <Card className="p-6 bg-white/70 backdrop-blur dark:bg-dark/70">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-electricBlue/15 text-electricBlue">
                  <Icon name="Search" />
                </div>
                <h3 className="text-xl font-semibold">Skim, then scan</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Read the first/last sentences for gist. Scan for names, numbers, and keywords.
                </p>
                <Link href="/resources/reading#skimming" className="mt-4 inline-flex items-center gap-2 text-electricBlue">
                  Learn more <Icon name="ArrowRight" size={18} />
                </Link>
              </Card>

              <Card className="p-6 bg-white/70 backdrop-blur dark:bg-dark/70">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-electricBlue/15 text-electricBlue">
                  <Icon name="Clock" />
                </div>
                <h3 className="text-xl font-semibold">Use micro-timers</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Allocate time per passage and stick to it to avoid rushing the last set.
                </p>
                <Link href="/resources/reading#timing" className="mt-4 inline-flex items-center gap-2 text-electricBlue">
                  Learn more <Icon name="ArrowRight" size={18} />
                </Link>
              </Card>

              <Card className="p-6 bg-white/70 backdrop-blur dark:bg-dark/70">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-electricBlue/15 text-electricBlue">
                  <Icon name="BookMarked" />
                </div>
                <h3 className="text-xl font-semibold">Trap decoders</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Learn common distractors in TFNG and MCQ to raise accuracy quickly.
                </p>
                <Link href="/resources/reading#traps" className="mt-4 inline-flex items-center gap-2 text-electricBlue">
                  Learn more <Icon name="ArrowRight" size={18} />
                </Link>
              </Card>
            </div>
          )}
        </Container>
      </Section>
    </>
  );
}