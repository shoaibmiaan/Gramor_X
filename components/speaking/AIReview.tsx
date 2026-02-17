import React, { useEffect, useState } from 'react';
import { Card } from '@/components/design-system/Card';
import { Alert } from '@/components/design-system/Alert';
import { ScoreCard } from '@/components/design-system/ScoreCard';
import { Button } from '@/components/design-system/Button';
import { Loader } from '@/components/common/Loader';
import { AISkeleton } from '@/components/common/Skeleton';

/**
 * Parse AI annotations in the same `[g]..[/g]` / `[v]..[/v]` format used by
 * the writing review component. Grammar issues are highlighted in red and
 * vocabulary issues in yellow.
 */
function renderAnnotated(text: string): React.ReactNode {
  const out: React.ReactNode[] = [];
  const regex = /\[(g|v)\](.*?)\[\/\1\]/gs;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const cls =
      m[1] === 'g'
        ? 'bg-sunsetRed/20 text-sunsetRed dark:text-sunsetRed'
        : 'bg-goldenYellow/20 text-sunsetOrange dark:text-sunsetOrange';
    out.push(
      <span key={key++} className={`rounded px-0.5 ${cls}`}>
        {m[2]}
      </span>
    );
    last = regex.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

async function annotate(text: string, signal?: AbortSignal): Promise<string> {
  try {
    const res = await fetch('/api/ai/chat?p=openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content:
              'Highlight grammar with [g][/g] and vocabulary issues with [v][/v]. Return only the annotated text.'
          },
          { role: 'user', content: text }
        ]
      }),
      signal,
    });
    if (!res.body) return text;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let out = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n\n')) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const json = JSON.parse(data);
            const delta = json?.choices?.[0]?.delta?.content;
            if (delta) out += delta;
          } catch {}
        }
      }
    }
    return out || text;
  } catch {
    return text;
  }
}

export interface SpeakingAIReviewProps {
  attemptId: string;
}

/**
 * Runs AI scoring for a speaking attempt, then renders the transcript with
 * inline highlights plus band score and suggestions.
 */
export const AIReview: React.FC<SpeakingAIReviewProps> = ({ attemptId }) => {
  const [data, setData] = useState<null | {
    transcript: string;
    bandOverall: number;
    criteria: { fluency: number; lexical: number; grammar: number; pronunciation: number };
    notes: string;
  }>(null);
  const [annotated, setAnnotated] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [longWait, setLongWait] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const handleRetry = React.useCallback(() => {
    if (loading) return;
    setRetryKey((value) => value + 1);
  }, [loading]);

  useEffect(() => {
    let active = true;
    let jitterTimer: ReturnType<typeof setTimeout> | null = null;
    let longWaitTimer: ReturnType<typeof setTimeout> | null = null;
    const abort = typeof AbortController !== 'undefined' ? new AbortController() : null;

    const clearTimers = () => {
      if (jitterTimer) {
        window.clearTimeout(jitterTimer);
        jitterTimer = null;
      }
      if (longWaitTimer) {
        window.clearTimeout(longWaitTimer);
        longWaitTimer = null;
      }
    };

    const load = async () => {
      try {
        setError(null);
        const resp = await fetch('/api/speaking/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attemptId }),
          signal: abort?.signal,
        });
        if (!resp.ok) throw new Error('Scoring failed');
        const json = await resp.json();
        if (!active) return;
        setData(json);
        const ann = await annotate(json.transcript, abort?.signal);
        if (!active) return;
        setAnnotated(ann);
      } catch (e: any) {
        if (active) setError(e.message || 'Failed to score attempt');
      } finally {
        clearTimers();
        if (active) {
          setLoading(false);
          setLongWait(false);
        }
      }
    };

    setData(null);
    setAnnotated('');
    setLoading(true);
    setLongWait(false);

    const start = () => {
      if (!active) return;
      longWaitTimer = window.setTimeout(() => {
        if (active) setLongWait(true);
      }, 10000);
      void load();
    };

    const jitter = 200 + Math.floor(Math.random() * 400);
    jitterTimer = window.setTimeout(start, jitter);

    return () => {
      active = false;
      clearTimers();
      abort?.abort();
    };
  }, [attemptId, retryKey]);

  if (loading) {
    return (
      <AISkeleton rows={6} showHeader={false}>
        <Loader label="Scoring your speaking attempt…" />
        {longWait ? (
          <Alert variant="info" title="This is taking longer than usual" className="mt-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-body text-muted-foreground">
                Our AI needs a little more time. You can keep waiting or retry.
              </p>
              <Button size="sm" variant="secondary" onClick={handleRetry} disabled={loading}>
                Retry
              </Button>
            </div>
          </Alert>
        ) : null}
      </AISkeleton>
    );
  }
  if (error) {
    return (
      <Alert variant="warning" title="AI review failed">
        <div className="flex flex-wrap items-center gap-3">
          <span>{error}</span>
          <Button size="sm" variant="secondary" onClick={handleRetry} disabled={loading}>
            Retry
          </Button>
        </div>
      </Alert>
    );
  }
  if (!data) return null;

  return (
    <Card className="card-surface p-6 rounded-ds-2xl">
      <ScoreCard
        title="Speaking Band"
        overall={data.bandOverall}
        subscores={{
          fluency: data.criteria.fluency,
          vocabulary: data.criteria.lexical,
          grammar: data.criteria.grammar,
          pronunciation: data.criteria.pronunciation,
        }}
      />
      <h3 className="text-h3 mt-6">Transcript</h3>
      <div className="p-3.5 rounded-ds border border-lightBorder dark:border-white/10 whitespace-pre-wrap">
        {renderAnnotated(annotated || data.transcript)}
      </div>
      {data.notes && (
        <Alert variant="info" title="Suggestions" className="mt-6">
          {data.notes}
        </Alert>
      )}
    </Card>
  );
};

export default AIReview;

