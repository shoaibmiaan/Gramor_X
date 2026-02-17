// pages/ai/coach/index.tsx
import React, { useCallback, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

// Design-system components (already present in your repo)
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Separator } from '@/components/design-system/Separator';
import { ProgressBar } from '@/components/design-system/ProgressBar';

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

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Header / breadcrumbs */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Coach</h1>
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
                  <Button size="sm" variant="secondary" onClick={() => addToPlan(s)}>
                    Add to Plan
                  </Button>
                  <Button size="sm" onClick={() => startTimer(s.estimatedMinutes)}>Start Timer</Button>
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

// TODO: Wire these to your existing planner/timer systems later without API changes
function addToPlan(_s: CoachSuggestion) {
  // noop for MVP UI — intentionally left blank to avoid changing any backend code
}

function startTimer(_mins: number) {
  // noop for MVP UI — intentionally left blank to avoid changing any backend code
}
