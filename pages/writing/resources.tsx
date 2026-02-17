// pages/writing/resources.tsx
import * as React from 'react';
import type { GetServerSideProps } from 'next';
import Link from 'next/link';

import { Container } from '@/components/design-system/Container';
import { Section } from '@/components/design-system/Section';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { ProgressBar } from '@/components/design-system/ProgressBar';
import { Alert } from '@/components/design-system/Alert';
import { getServerClient } from '@/lib/supabaseServer';

import { QUICK_TIPS, type Tip, type Focus } from '@/data/writing/tips';
import { MICRO_TASKS, type MicroTask } from '@/data/writing/micro';
import { track } from '@/lib/analytics/events';

type Props = {
  userId: string | null;
  userName: string | null;
  targetBand: number | null;
  completed: Record<string, boolean>;
};

const FOCUS_LABEL: Record<Focus, string> = {
  task_response: 'Task Response',
  coherence: 'Coherence & Cohesion',
  lexical: 'Lexical Resource',
  grammar: 'Grammar Range & Accuracy',
};

type Insights = {
  weakestCriterion: keyof typeof FOCUS_LABEL | null;
  recommendations: Array<{ id: string; title: string; summary: string; focus: keyof typeof FOCUS_LABEL }>;
  tasks: Array<{ id: string; title: string; minutes: number; focus: keyof typeof FOCUS_LABEL; prompt: string }>;
};

const limitText = (s: string, max = 500) => (s || '').replace(/\s+/g, ' ').trim().slice(0, max);

export default function WritingResources({ userId, userName, targetBand, completed }: Props) {
  const [tab, setTab] = React.useState<'learn' | 'micro' | 'insights'>('learn');
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});
  const [done, setDone] = React.useState<Record<string, boolean>>(() => completed || {});
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [loadingId, setLoadingId] = React.useState<string | null>(null);

  // AI Insights state
  const [insights, setInsights] = React.useState<Insights | null>(null);
  const [aiErr, setAiErr] = React.useState<string | null>(null);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiStatus, setAiStatus] = React.useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const needPlan = 'starter';

  const total = QUICK_TIPS.length + MICRO_TASKS.length;
  const progress = React.useMemo(
    () => (total ? Math.round((Object.values(done).filter(Boolean).length / total) * 100) : 0),
    [done, total],
  );

  React.useEffect(() => {
    track('writing_resources_view', { tab: tab });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChange = (id: string, v: string) => setDrafts((p) => ({ ...p, [id]: v }));

  async function logComplete(kind: 'tip' | 'micro', refId: string, draft?: string) {
    setErrorMsg(null);
    setLoadingId(refId);
    setDone((p) => ({ ...p, [refId]: true })); // optimistic
    try {
      const res = await fetch('/api/writing/log-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, refId, draft }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || `Request failed (${res.status})`);
      }
      track('writing_practice_complete', {
        kind,
        refId,
        text_len: (draft || '').trim().length,
      });
    } catch (e: any) {
      setDone((p) => ({ ...p, [refId]: completed?.[refId] ?? false })); // rollback
      setErrorMsg(e?.message || 'Failed to save progress');
    } finally {
      setLoadingId(null);
    }
  }

  async function practiceAgain(kind: 'tip' | 'micro', refId: string) {
    const prev = drafts[refId];
    await logComplete(kind, refId, prev);
    setDrafts((p) => ({ ...p, [refId]: '' }));
    track('writing_practice_again', { kind, refId });
  }

  // Track tab changes
  React.useEffect(() => {
    track('writing_resources_tab', { tab });
  }, [tab]);

  // Fetch insights when tab opened first time
  React.useEffect(() => {
    if (tab !== 'insights') return;
    if (aiStatus !== 'idle') return;

    setAiLoading(true);
    setAiStatus('loading');
    setAiErr(null);

    (async () => {
      try {
        const res = await fetch('/api/ai/writing/insights');
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          if (res.status === 401) throw new Error('Sign in to view AI Insights.');
          if (res.status === 403) throw new Error(`Requires ${needPlan} plan (or teacher/admin).`);
          if (res.status === 429) throw new Error('Daily quota reached for AI Insights.');
          throw new Error(payload?.error || `Request failed (${res.status})`);
        }
        const data = (await res.json()) as Insights;
        setInsights(data);
        setAiStatus('ready');
        track('writing_ai_insights_ready', { empty: !data.weakestCriterion && data.recommendations.length === 0 && data.tasks.length === 0 });
      } catch (err: any) {
        const msg = err?.message || 'Failed to load insights';
        setAiErr(msg);
        setAiStatus('error');
        track('writing_ai_insights_error', { message: msg });
      } finally {
        setAiLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, aiStatus]);

  return (
    <Section className="py-16 bg-lightBg dark:bg-gradient-to-b dark:from-dark/70 dark:to-darker/90">
      <Container>
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Writing • Tips & Resources</h1>
              <p className="text-muted mt-1">
                {userName ? `Welcome, ${userName}. ` : ''}Target Band: {targetBand ?? '—'} • Practice beats passive reading.
              </p>
            </div>
            <div className="w-40">
              <ProgressBar value={progress} />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Badge variant="info">IELTS Writing</Badge>
            <Badge variant="success">Practice-first</Badge>
            <Badge variant="neutral">Server-tracked</Badge>
          </div>
          {process.env.NEXT_PUBLIC_GATE_MODE === 'writing-only' && (
            <div className="mt-4">
              <Alert variant="info">Writing mode is open. Other modules are marked “Coming Soon”.</Alert>
            </div>
          )}
          {errorMsg && (
            <div className="mt-4" role="alert" aria-live="assertive">
              <Alert variant="warning">{errorMsg}</Alert>
            </div>
          )}
          <span className="sr-only" aria-live="polite">
            {loadingId ? 'Saving…' : 'Idle'}
          </span>
        </header>

        {/* Downloadables */}
<Card className="mb-8 p-4">
  <h3 className="text-lg font-semibold">Downloadables</h3>
  <p className="text-muted mt-1">Print-friendly references for quick revision.</p>
  <div className="mt-4 grid gap-3 md:grid-cols-3">
    <Link
      href="/resources/writing/cheatsheet-grammar.html"
      className="inline-flex"
      onClick={() => track('writing_dl_click', { file: 'cheatsheet-grammar.html' })}
    >
      <Button variant="secondary">Grammar Cheatsheet</Button>
    </Link>

    <Link
      href="/resources/writing/linking-words.html"
      className="inline-flex"
      onClick={() => track('writing_dl_click', { file: 'linking-words.html' })}
    >
      <Button variant="secondary">Linking Words Bank</Button>
    </Link>

    <Link
      href="/resources/writing/task2-templates.html"
      className="inline-flex"
      onClick={() => track('writing_dl_click', { file: 'task2-templates.html' })}
    >
      <Button variant="secondary">Task 2 Templates</Button>
    </Link>
  </div>
</Card>


        {/* Tabs */}
        <nav className="mb-8 flex gap-2" role="tablist" aria-label="Resources tabs">
          <Button role="tab" aria-selected={tab === 'learn'} aria-controls="panel-learn"
            variant={tab === 'learn' ? 'primary' : 'ghost'} onClick={() => setTab('learn')}>
            Learn & Apply
          </Button>
          <Button role="tab" aria-selected={tab === 'micro'} aria-controls="panel-micro"
            variant={tab === 'micro' ? 'primary' : 'ghost'} onClick={() => setTab('micro')}>
            Micro Practice
          </Button>
          <Button role="tab" aria-selected={tab === 'insights'} aria-controls="panel-insights"
            variant={tab === 'insights' ? 'primary' : 'ghost'} onClick={() => setTab('insights')}>
            AI Insights
          </Button>
        </nav>

        {/* LEARN */}
        <div id="panel-learn" role="tabpanel" hidden={tab !== 'learn'}>
          <div className="grid gap-4 md:grid-cols-2">
            {QUICK_TIPS.map((tip: Tip) => {
              const draft = drafts[tip.id] || '';
              const isSaving = loadingId === tip.id;
              const isDone = !!done[tip.id];
              return (
                <Card key={tip.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">{tip.title}</h3>
                      <div className="mt-1 flex gap-2">
                        <Badge variant="neutral">{FOCUS_LABEL[tip.focus]}</Badge>
                        <Badge variant={tip.level === 'beginner' ? 'success' : 'warning'}>
                          {tip.level === 'beginner' ? 'Beginner' : 'Advanced'}
                        </Badge>
                      </div>
                    </div>
                    {isDone ? <Badge variant="success">Done</Badge> : null}
                  </div>

                  <p className="mt-3 text-muted">{tip.twoLiner}</p>

                  <div className="mt-4">
                    <p className="mb-2 font-medium">Quick Practice</p>
                    <p className="text-sm">{tip.practicePrompt}</p>
                    <label className="sr-only" htmlFor={`draft-${tip.id}`}>Your response</label>
                    <textarea
                      id={`draft-${tip.id}`}
                      className="mt-3 w-full rounded-md border p-3 focus:outline-none"
                      rows={4}
                      value={draft}
                      onChange={(e) => onChange(tip.id, e.target.value)}
                      placeholder="Write your short response here…"
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      variant="primary"
                      onClick={() => logComplete('tip', tip.id, draft)}
                      disabled={isSaving || !draft || draft.trim().length < 15}
                      aria-busy={isSaving}
                      aria-disabled={isSaving || !draft || draft.trim().length < 15}
                      title="Save this attempt"
                    >
                      {isSaving ? 'Saving…' : (isDone ? 'Saved' : 'Mark Complete')}
                    </Button>
                    <Button variant="ghost" onClick={() => practiceAgain('tip', tip.id)} title="Log another attempt and start fresh">
                      Practice Again
                    </Button>
                    <Link
                      href={{ pathname: '/mistakes', query: { kind: 'tip', id: tip.id, source: 'resources', text: limitText(draft) } }}
                      className="inline-flex"
                    >
                      <Button variant="ghost" title="Send your text to Mistakes Book">Add to Mistakes Book</Button>
                    </Link>
                    <Link href="/writing/mock" className="ml-auto inline-flex" onClick={() => track('writing_cta_click', { cta: 'full_mock' })}>
                      <Button variant="secondary">Full Practice</Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* MICRO */}
        <div id="panel-micro" role="tabpanel" hidden={tab !== 'micro'}>
          <div className="grid gap-4 md:grid-cols-2">
            {MICRO_TASKS.map((t: MicroTask) => {
              const draft = drafts[t.id] || '';
              const isSaving = loadingId === t.id;
              const isDone = !!done[t.id];
              return (
                <Card key={t.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">{t.title}</h3>
                      <div className="mt-1 flex gap-2">
                        <Badge variant="neutral">{FOCUS_LABEL[t.focus]}</Badge>
                        <Badge variant={t.level === 'beginner' ? 'success' : 'warning'}>
                          {t.level === 'beginner' ? 'Beginner' : 'Advanced'}
                        </Badge>
                        <Badge variant="info">{t.minutes} min</Badge>
                      </div>
                    </div>
                    {isDone ? <Badge variant="success">Done</Badge> : null}
                  </div>

                  <p className="mt-3 text-sm">{t.prompt}</p>
                  <label className="sr-only" htmlFor={`draft-${t.id}`}>Your response</label>
                  <textarea
                    id={`draft-${t.id}`}
                    className="mt-3 w-full rounded-md border p-3 focus:outline-none"
                    rows={4}
                    value={draft}
                    onChange={(e) => onChange(t.id, e.target.value)}
                    placeholder="Your short response…"
                  />

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      variant="primary"
                      onClick={() => logComplete('micro', t.id, draft)}
                      disabled={isSaving || !draft || draft.trim().length < 10}
                      aria-busy={isSaving}
                      aria-disabled={isSaving || !draft || draft.trim().length < 10}
                      title="Submit this micro-practice"
                    >
                      {isSaving ? 'Saving…' : (isDone ? 'Saved' : 'Submit')}
                    </Button>
                    <Button variant="ghost" onClick={() => practiceAgain('micro', t.id)} title="Log another attempt and start fresh">
                      Practice Again
                    </Button>
                    <Link
                      href={{ pathname: '/mistakes', query: { kind: 'micro', id: t.id, source: 'resources', text: limitText(draft) } }}
                      className="inline-flex"
                    >
                      <Button variant="ghost" title="Send your text to Mistakes Book">Add to Mistakes Book</Button>
                    </Link>
                    <Link href="/writing/explainers" className="ml-auto inline-flex" onClick={() => track('writing_cta_click', { cta: 'see_examples' })}>
                      <Button variant="ghost">See Examples</Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* AI INSIGHTS */}
        <div id="panel-insights" role="tabpanel" hidden={tab !== 'insights'}>
          <Card className="p-6">
            <h3 className="text-lg font-semibold">AI Insights</h3>

            {aiLoading && <p className="mt-2 text-muted">Loading your recent trends…</p>}

            {aiStatus === 'error' && aiErr && (
              <div className="mt-3">
                <Alert variant="warning">
                  {aiErr}{' '}
                  {/* 403: show pricing CTA; 401: sign-in; 429: quota CTA */}
                  {aiErr.toLowerCase().includes('requires') && (
                    <>
                      <span className="ml-1">Upgrade to continue.</span>{' '}
                      <Link
                        href={`/pricing/overview?reason=plan_required&need=${needPlan}&from=/writing/resources`}
                        className="inline-flex"
                        onClick={() => track('writing_cta_click', { cta: 'see_plans', need: needPlan })}
                      >
                        <Button variant="secondary">See Plans</Button>
                      </Link>
                    </>
                  )}
                  {aiErr.toLowerCase().includes('sign in') && !userId && (
                    <Link
                      href="/auth/login"
                      className="inline-flex ml-2"
                      onClick={() => track('writing_cta_click', { cta: 'sign_in' })}
                    >
                      <Button variant="secondary">Sign In</Button>
                    </Link>
                  )}
                  {aiErr.toLowerCase().includes('quota') && (
                    <Link
                      href={`/pricing/overview?reason=quota_exceeded&need=${needPlan}&from=/writing/resources`}
                      className="inline-flex ml-2"
                      onClick={() => track('writing_cta_click', { cta: 'upgrade_for_quota', need: needPlan })}
                    >
                      <Button variant="secondary">Upgrade Plan</Button>
                    </Link>
                  )}
                </Alert>
              </div>
            )}

            {aiStatus === 'ready' && insights && (
              <>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <Card className="p-4">
                    <p className="text-sm font-medium">Weakest Criterion</p>
                    <p className="text-muted mt-1">
                      {insights.weakestCriterion ? FOCUS_LABEL[insights.weakestCriterion] : '—'}
                    </p>
                  </Card>

                  <Card className="p-4">
                    <p className="text-sm font-medium">Recommended Focus</p>
                    <ul className="mt-2 list-disc pl-5 text-sm">
                      {insights.recommendations.length === 0 && <li>—</li>}
                      {insights.recommendations.map((r) => (
                        <li key={r.id}>
                          <span className="font-medium">{r.title}</span> — {r.summary}
                        </li>
                      ))}
                    </ul>
                  </Card>

                  <Card className="p-4">
                    <p className="text-sm font-medium">Next 3 Micro-Tasks</p>
                    <ul className="mt-2 list-disc pl-5 text-sm">
                      {insights.tasks.length === 0 && <li>—</li>}
                      {insights.tasks.map((t) => (
                        <li key={t.id}>
                          <span className="font-medium">{t.title}</span> ({t.minutes} min) — {FOCUS_LABEL[t.focus]}
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>

                <div className="mt-4">
                  <Alert variant="info">
                    This is a scaffold. When enabled, insights will analyze your last attempts and suggest targeted
                    practice. Gated at <code>{needPlan}</code> and above.
                  </Alert>
                </div>
              </>
            )}
          </Card>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link href="/writing/mock" className="inline-flex" onClick={() => track('writing_cta_click', { cta: 'begin_timed_mock' })}>
            <Button variant="primary">Begin Timed Mock</Button>
          </Link>
          <Link href="/writing/learn" className="inline-flex" onClick={() => track('writing_cta_click', { cta: 'open_guides' })}>
            <Button variant="ghost">Explore Full Guides</Button>
          </Link>
          <Link href="/mistakes" className="inline-flex" onClick={() => track('writing_cta_click', { cta: 'open_mistakes_book' })}>
            <Button variant="ghost">Open Mistakes Book</Button>
          </Link>
        </div>
      </Container>
    </Section>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const supabase = getServerClient(ctx.req, ctx.res);
  const { data: userRes } = await supabase.auth.getUser();

  let userName: string | null = null;
  let targetBand: number | null = null;
  let completed: Record<string, boolean> = {};

  if (userRes?.user) {
    const uid = userRes.user.id;

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, target_band')
      .eq('id', uid)
      .maybeSingle();

    userName = (profile?.full_name as string) ?? null;
    targetBand = (profile?.target_band as number) ?? null;

    const { data: logs } = await supabase
      .from('writing_activity_log')
      .select('ref_id')
      .order('created_at', { ascending: false });

    if (Array.isArray(logs)) {
      for (const row of logs) completed[row.ref_id as string] = true;
    }
  }

  return {
    props: {
      userId: userRes?.user?.id ?? null,
      userName,
      targetBand,
      completed,
    },
  };
};
