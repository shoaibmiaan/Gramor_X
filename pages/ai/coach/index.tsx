// pages/ai/coach/index.tsx
import React, { useCallback, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

// Design-system components (already present in your repo)
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Separator } from '@/components/design-system/Separator';
import { ProgressBar } from '@/components/design-system/ProgressBar';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import { coerceStudyPlan } from '@/utils/studyPlan';
import type { StudyPlan } from '@/types/plan';

const COACH_PAGE_STATUS: 'incomplete' | 'partial' = 'incomplete';
const COACH_ACTIONS_READY = false;

// --- Types that mirror your API shape (no API changes) ----------------------
export type CoachSuggestion = {
  id: string;
  title: string;
  detail: string;
  estimatedMinutes: number;
};

export type CoachResponse = {
  id?: string;
  summary?: string;
  suggestions?: CoachSuggestion[];
  reasoning?: string;
  // For mock/debug passthrough if provider returns raw
  raw?: unknown;
};

export type CoachError = {
  error: string;
  attempts?: Array<{ provider: string; status?: number; detail?: any }>; // mirrors API error
};

// --- Page ------------------------------------------------------------------
export default function CoachUIPage() {
  // Form state
  const [goal, setGoal] = useState('Band 7+ in Writing Task 2 in 6 weeks');
  const [context, setContext] = useState(
    'I often get 6.0–6.5 due to cohesion and grammar mistakes. I can study ~45 min/day.'
  );
  const [userId, setUserId] = useState<string>('');

  // Request state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<CoachError['attempts']>([]);
  const [data, setData] = useState<CoachResponse | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const totalMinutes = useMemo(() => {
    if (!data?.suggestions?.length) return 0;
    return data.suggestions.reduce((acc, s) => acc + (s.estimatedMinutes || 0), 0);
  }, [data]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setData(null);
    setAttempts([]);
    setLoading(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId || null, context, goal }),
        signal: controller.signal,
      });

      const json = await res.json();
      if (!res.ok) {
        const err = json as CoachError;
        setAttempts(err.attempts || []);
        setError(err.error || 'Something went wrong');
      } else {
        setData(json as CoachResponse);
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') setError(err?.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [context, goal, userId]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
  }, []);

  const copyJSON = useCallback(async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    } catch {}
  }, [data]);


  const handleAddToPlan = useCallback(async (suggestion: CoachSuggestion) => {
    setActionError(null);
    try {
      await addToPlan(suggestion);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to add this item to your study plan.');
    }
  }, []);

  const handleStartTimer = useCallback(async (suggestion: CoachSuggestion) => {
    setActionError(null);
    try {
      await startTimer(suggestion);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to start the tracked timer session.');
    }
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Header / breadcrumbs */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">AI Coach</h1>
            <Badge variant="outline">Beta</Badge>
            <Badge variant="secondary">{COACH_PAGE_STATUS}</Badge>
          </div>
          <p className="text-muted-foreground">Smart, actionable IELTS practice suggestions powered by your existing /api/ai/coach.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="secondary">Home</Button>
          </Link>
          <Button variant="ghost" onClick={copyJSON} disabled={!data}>Copy JSON</Button>
        </div>
      </div>

      <Separator className="my-6" />

      {!COACH_ACTIONS_READY && (
        <Card className="mb-6 p-4">
          <p className="text-sm">Add-to-plan and timer actions are in beta/incomplete mode and remain disabled for now.</p>
        </Card>
      )}

      {actionError && (
        <Card className="mb-6 p-4">
          <p className="text-sm text-destructive">{actionError}</p>
        </Card>
      )}

      {/* Request card */}
      <Card className="p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-6 space-y-2">
            <label className="text-sm font-medium">Goal</label>
            <input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
              placeholder="Your target (e.g., Band 7 in 6 weeks)"
            />
          </div>

          <div className="md:col-span-6 space-y-2">
            <label className="text-sm font-medium">Optional User ID</label>
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
              placeholder="(For saving logs in Supabase)"
            />
          </div>

          <div className="md:col-span-12 space-y-2">
            <label className="text-sm font-medium">Context</label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={4}
              className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
              placeholder="Share issues, time availability, recent scores, etc."
            />
          </div>

          <div className="md:col-span-12 flex items-center gap-3 pt-2">
            {!loading && (
              <Button type="submit">Get Suggestions</Button>
            )}
            {loading && (
              <Button type="button" variant="destructive" onClick={cancel}>Cancel</Button>
            )}
            <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">Groq</Badge>
              <Badge variant="outline">Gemini</Badge>
              <Badge variant="outline">OpenAI</Badge>
              <Badge variant="outline">DeepSeek</Badge>
              <Badge variant="outline">Grok</Badge>
            </div>
          </div>
        </form>
      </Card>

      {/* Loading state */}
      {loading && (
        <Card className="mt-6 p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm">Generating plan…</p>
            <span className="text-xs text-muted-foreground">Provider fallback chain active</span>
          </div>
          <div className="mt-4 space-y-3">
            <SkeletonLine />
            <SkeletonLine width="w-5/6" />
            <SkeletonLine width="w-3/4" />
          </div>
        </Card>
      )}

      {/* Error state */}
      {!loading && error && (
        <Card className="mt-6 p-6">
          <h3 className="mb-2 text-lg font-semibold">All providers failed</h3>
          <p className="text-sm text-destructive">{error}</p>
          {!!attempts?.length && (
            <div className="mt-4 space-y-2">
              {attempts.map((a, i) => (
                <div key={i} className="rounded-md border p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{a.provider}</span>
                    <Badge variant="secondary">{a.status ?? '—'}</Badge>
                  </div>
                  <pre className="mt-2 overflow-auto whitespace-pre-wrap text-[11px] opacity-80">{safeString(a.detail)}</pre>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Success state */}
      {!loading && !error && data && (
        <>
          <Card className="mt-6 p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-semibold">Your plan</h3>
                {data.summary && (
                  <p className="text-sm text-muted-foreground">{data.summary}</p>
                )}
              </div>
              <div className="w-full md:w-72">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span>Total minutes</span>
                  <span className="font-medium">{totalMinutes} min</span>
                </div>
                <ProgressBar value={Math.min(100, (totalMinutes / 90) * 100)} />
              </div>
            </div>
          </Card>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(data.suggestions || []).map((s) => (
              <Card key={s.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-base font-semibold leading-tight">{s.title}</h4>
                  <Badge>{s.estimatedMinutes} min</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{s.detail}</p>
                <Separator className="my-4" />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleAddToPlan(s)}
                    disabled={!COACH_ACTIONS_READY}
                  >
                    Add to Plan
                  </Button>
                  <Button size="sm" onClick={() => handleStartTimer(s)} disabled={!COACH_ACTIONS_READY}>
                    Start Timer
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {data.reasoning && (
            <Card className="mt-6 p-6">
              <h3 className="text-sm font-semibold">Model reasoning</h3>
              <p className="mt-2 text-sm text-muted-foreground">{data.reasoning}</p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// --- Little helpers ---------------------------------------------------------
function SkeletonLine({ width = 'w-4/5' }: { width?: string }) {
  return <div className={`h-3 rounded bg-muted ${width}`} />;
}

function safeString(v: unknown) {
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

async function addToPlan(s: CoachSuggestion) {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user?.id) throw new Error('Please sign in to save this task in your study plan.');

  const { data: row, error } = await supabase
    .from('study_plans')
    .select('plan_json,start_iso,weeks,goal_band')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw new Error(error.message || 'Failed to load your study plan.');
  if (!row) throw new Error('No study plan found. Create one first from /study-plan.');

  const plan = coerceStudyPlan(row.plan_json ?? row, user.id, {
    startISO: row.start_iso ?? undefined,
    weeks: row.weeks ?? undefined,
    goalBand: row.goal_band ?? undefined,
  });

  if (!plan) throw new Error('Your study plan data is invalid. Please regenerate it.');

  const todayIso = new Date();
  todayIso.setUTCHours(0, 0, 0, 0);
  const todayKey = todayIso.toISOString().slice(0, 10);

  const days = [...plan.days];
  const existingIndex = days.findIndex((day) => day.dateISO.slice(0, 10) === todayKey);
  const task = {
    id: `coach-${s.id}`,
    type: 'review' as const,
    title: s.title,
    estMinutes: Math.max(5, Math.round(s.estimatedMinutes || 0)),
    completed: false,
  };

  if (existingIndex >= 0) {
    const exists = days[existingIndex].tasks.some((t) => t.id === task.id || t.title === s.title);
    if (!exists) days[existingIndex] = { ...days[existingIndex], tasks: [...days[existingIndex].tasks, task] };
  } else {
    days.push({ dateISO: todayIso.toISOString(), tasks: [task] });
    days.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  }

  const payload: StudyPlan = { ...plan, days };
  const { error: persistError } = await supabase
    .from('study_plans')
    .upsert(
      {
        user_id: user.id,
        plan_json: payload,
        start_iso: payload.startISO,
        weeks: payload.weeks,
        goal_band: payload.goalBand ?? null,
      },
      { onConflict: 'user_id' },
    );

  if (persistError) throw new Error(persistError.message || 'Failed to save this task to your plan.');

  await fetch('/api/study-plan/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ event: 'studyplan_update', payload: { source: 'ai_coach', suggestionId: s.id } }),
    keepalive: true,
  });
}

async function startTimer(s: CoachSuggestion) {
  const createRes = await fetch('/api/study-buddy/sessions/create', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      items: [{ skill: 'AI Coach', minutes: Math.max(5, Math.round(s.estimatedMinutes || 0)), topic: s.title }],
    }),
  });
  const createJson = await createRes.json();
  if (!createRes.ok || !createJson?.session?.id) {
    throw new Error(createJson?.error || 'Could not create a tracked study timer session.');
  }

  const startRes = await fetch(`/api/study-buddy/sessions/${encodeURIComponent(createJson.session.id)}/start`, {
    method: 'POST',
  });
  if (!startRes.ok) {
    const startJson = await startRes.json().catch(() => null);
    throw new Error(startJson?.error || 'Could not start the study timer session.');
  }
}
