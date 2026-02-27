import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Input } from '@/components/design-system/Input';
import { Alert } from '@/components/design-system/Alert';
import { Loader } from '@/components/common/Loader';

export const AiTestDrive: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [longWait, setLongWait] = useState(false);
  const waitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (waitTimer.current) {
        window.clearTimeout(waitTimer.current);
        waitTimer.current = null;
      }
    };
  }, []);

  async function handleAsk(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setAnswer(null);
    if (!q.trim()) {
      setError('Please enter a one-line question.');
      return;
    }
    setLoading(true);
    setLongWait(false);
    if (waitTimer.current) {
      window.clearTimeout(waitTimer.current);
    }
    waitTimer.current = window.setTimeout(() => setLongWait(true), 10000);
    const jitter = 200 + Math.floor(Math.random() * 400);
    await new Promise((resolve) => setTimeout(resolve, jitter));
    try {
      const r = await fetch('/api/ai/test-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q.trim() }),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) {
        const rawMessage = typeof data?.error === 'string' ? data.error : null;
        const friendly = !rawMessage
          ? "We couldn't get an answer this time. Please try again in a few seconds."
          : /404/.test(rawMessage)
            ? 'The AI service is temporarily unavailable. Please try again shortly.'
            : rawMessage;
        setError(friendly);
      } else {
        setAnswer(data.answer);
      }
    } catch (err: any) {
      const message = typeof err?.message === 'string' ? err.message : null;
      setError(message ? `We couldn't get an answer: ${message}` : 'Network error. Please try again.');
    } finally {
      if (waitTimer.current) {
        window.clearTimeout(waitTimer.current);
        waitTimer.current = null;
      }
      setLoading(false);
      setLongWait(false);
    }
  }

  return (
    <Card className={`card-surface p-6 rounded-ds-2xl ${className}`}>
      <h3 className="text-h3 font-semibold mb-2">⚡ Test the AI (2–3 lines)</h3>
      <p className="text-muted-foreground mb-4">Ask a quick question to see how the AI replies. This won’t affect your scores.</p>

      <form onSubmit={handleAsk} className="flex flex-col md:flex-row gap-3">
        <Input
          placeholder="e.g., How to improve coherence in Task 2?"
          value={q}
          onChange={e => setQ(e.target.value)}
          aria-label="Your question"
          maxLength={200}
          className="flex-1"
        />
        <Button type="submit" variant="primary" className="rounded-ds-xl" disabled={loading}>
          {loading ? 'Thinking…' : 'Ask'}
        </Button>
      </form>

      {loading ? <Loader label="Asking the AI…" className="mt-3" /> : null}
      {loading && longWait ? (
        <Alert variant="info" className="mt-3" title="This is taking a little longer">
          Hang tight—our AI is still generating a reply. You can keep waiting or try again in a moment.
        </Alert>
      ) : null}

      {error && (
        <Alert variant="warning" className="mt-4" title="Couldn't get an answer">
          {error}
        </Alert>
      )}

      {answer && (
        <div className="mt-4 p-3.5 rounded-ds border border-lightBorder dark:border-white/10">
          <div className="whitespace-pre-line">{answer}</div>
        </div>
      )}
    </Card>
  );
};
