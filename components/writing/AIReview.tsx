import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card } from '@/components/design-system/Card';
import { Alert } from '@/components/design-system/Alert';
import { ScoreCard } from '@/components/design-system/ScoreCard';
import { Button } from '@/components/design-system/Button';
import { Loader } from '@/components/common/Loader';
import { AISkeleton } from '@/components/common/Skeleton';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

/**
 * Highlight grammar and vocabulary issues by parsing custom markers
 * produced by the AI. Grammar problems are wrapped in `[g]...[/g]` and
 * vocabulary issues in `[v]...[/v]`. The returned React nodes preserve
 * original spacing and new lines.
 */
function renderAnnotated(text: string): React.ReactNode {
  const pieces: React.ReactNode[] = [];
  const regex = /\[(g|v)\](.*?)\[\/\1\]/gs;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      pieces.push(text.slice(lastIndex, match.index));
    }
    const type = match[1];
    const content = match[2];
    const cls =
      type === 'g'
        ? 'bg-sunsetRed/20 text-sunsetRed dark:text-sunsetRed'
        : 'bg-goldenYellow/20 text-sunsetOrange dark:text-sunsetOrange';
    pieces.push(
      <span key={key++} className={`rounded px-0.5 ${cls}`}>
        {content}
      </span>
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    pieces.push(text.slice(lastIndex));
  }
  return <>{pieces}</>;
}

// Read server-sent events from /api/ai/chat and accumulate the delta text.
async function annotateText(original: string, signal?: AbortSignal): Promise<string> {
  try {
    const res = await fetch('/api/ai/chat?p=openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content:
              'Surround grammar mistakes with [g][/g] and vocabulary issues with [v][/v]. Return only the annotated text.'
          },
          { role: 'user', content: original }
        ]
      }),
      signal,
    });
    if (!res.body) return original;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let result = '';
    let finished = false;

    const processBuffer = () => {
      if (finished) return;
      let newlineIndex = buffer.indexOf('\n');
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (line.startsWith('data: ')) {
          const payload = line.slice(6).trim();
          if (!payload) {
            // continue processing remaining lines
          } else if (payload === '[DONE]') {
            finished = true;
            return;
          } else {
            try {
              const json = JSON.parse(payload);
              const delta = json?.choices?.[0]?.delta?.content;
              if (typeof delta === 'string') {
                result += delta;
              }
            } catch {
              // ignore malformed lines and continue reading
            }
          }
        }
        newlineIndex = buffer.indexOf('\n');
      }
    };

    while (!finished) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
      processBuffer();
      if (finished || done) break;
    }

    buffer += decoder.decode();
    processBuffer();
    const leftover = buffer.trim();
    if (!finished && leftover.startsWith('data: ')) {
      const payload = leftover.slice(6).trim();
      if (payload && payload !== '[DONE]') {
        try {
          const json = JSON.parse(payload);
          const delta = json?.choices?.[0]?.delta?.content;
          if (typeof delta === 'string') {
            result += delta;
          }
        } catch {
          // ignore malformed final payload
        }
      }
    }

    return result || original;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    return original;
  }
}

export interface WritingAIReviewProps {
  /** ID of the writing attempt already saved in Supabase */
  attemptId: string;
}

type AttemptRow = {
  essay_text: string;
  band_overall: number;
  band_breakdown: { task: number; coherence: number; lexical: number; grammar: number };
  feedback: string | null;
};

/**
 * Displays an AI generated review for a writing attempt. The component
 * fetches the attempt details from Supabase, asks the AI to annotate the
 * essay with grammar and vocabulary highlights, then renders the band
 * score, annotated essay and a suggestions panel.
 */
export const AIReview: React.FC<WritingAIReviewProps> = ({ attemptId }) => {
  const [attempt, setAttempt] = useState<AttemptRow | null>(null);
  const [annotated, setAnnotated] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [longWait, setLongWait] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const handleRetry = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setAttempt(null);
    setAnnotated('');
    setError(null);
    setLoading(true);
    setLongWait(false);
    setRetryKey((value) => value + 1);
  }, []);

  useEffect(() => {
    let mounted = true;
    let jitterTimer: ReturnType<typeof setTimeout> | null = null;
    let longWaitTimer: ReturnType<typeof setTimeout> | null = null;
    const abort = typeof AbortController !== 'undefined' ? new AbortController() : null;
    abortRef.current = abort;

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
      let aborted = false;
      try {
        setError(null);
        const { data, error } = await supabaseBrowser
          .from('writing_attempts')
          .select('essay_text, band_overall, band_breakdown, feedback')
          .eq('id', attemptId)
          .single();
        if (error) throw error;
        if (!mounted) return;
        setAttempt(data as AttemptRow);
        const a = await annotateText(data.essay_text, abort?.signal);
        if (!mounted) return;
        setAnnotated(a);
      } catch (e: any) {
        if (e?.name === 'AbortError') {
          aborted = true;
          return;
        }
        if (mounted) setError(e.message || 'Failed to load review');
      } finally {
        clearTimers();
        if (abortRef.current === abort) {
          abortRef.current = null;
        }
        if (mounted && !aborted) {
          setLoading(false);
          setLongWait(false);
        }
      }
    };

    setAttempt(null);
    setAnnotated('');
    setLoading(true);
    setLongWait(false);

    const start = () => {
      if (!mounted) return;
      longWaitTimer = window.setTimeout(() => {
        if (mounted) setLongWait(true);
      }, 10000);
      void load();
    };

    const jitter = 200 + Math.floor(Math.random() * 400);
    jitterTimer = window.setTimeout(start, jitter);

    return () => {
      mounted = false;
      clearTimers();
      if (abortRef.current === abort) {
        abortRef.current = null;
      }
      abort?.abort();
    };
  }, [attemptId, retryKey]);

  if (loading) {
    return (
      <AISkeleton rows={6} showHeader={false}>
        <Loader label="Generating AI review…" />
        {longWait ? (
          <Alert variant="info" title="This is taking longer than usual" className="mt-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-body text-muted-foreground">
                Our AI is still working. You can wait a little longer or retry now.
              </p>
              <Button size="sm" variant="secondary" onClick={handleRetry}>
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

  if (!attempt) return null;

  return (
    <Card className="card-surface p-6 rounded-ds-2xl">
      <ScoreCard
        title="Writing Band"
        overall={attempt.band_overall}
        subscores={{
          taskResponse: attempt.band_breakdown.task,
          coherence: attempt.band_breakdown.coherence,
          vocabulary: attempt.band_breakdown.lexical,
          grammar: attempt.band_breakdown.grammar,
        }}
      />

      <h3 className="text-h3 mt-6">Your Essay</h3>
      <div className="p-3.5 rounded-ds border border-lightBorder dark:border-white/10 whitespace-pre-wrap">
        {renderAnnotated(annotated || attempt.essay_text)}
      </div>

      {attempt.feedback && (
        <Alert variant="info" title="Suggestions" className="mt-6">
          {attempt.feedback}
        </Alert>
      )}
    </Card>
  );
};

export default AIReview;

