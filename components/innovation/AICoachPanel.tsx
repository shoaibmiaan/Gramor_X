import React, { useEffect, useMemo, useState } from 'react';

type Profile = {
  user_id?: string;
  full_name?: string;
  email?: string;
};

type AICoachRequest = {
  userId?: string | null;
  context?: string;
  goal?: string;
};

type AICoachResponse = {
  id: string;
  summary: string;
  suggestions: Array<{ id: string; title: string; detail?: string; estimatedMinutes?: number }>;
  reasoning?: string;
};

export default function AICoachPanel({ profile, onClose, onOpenStudyBuddy }: {
  profile?: Profile | null;
  onClose: () => void;
  onOpenStudyBuddy?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<AICoachResponse | null>(null);
  const [context, setContext] = useState('Show me five things I should focus on to improve my IELTS writing band by 0.5');
  const [running, setRunning] = useState(false);

  useEffect(() => {
    // Auto-run on open for convenience
    void runCoach();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runCoach = async () => {
    setError(null);
    setLoading(true);
    try {
      const payload: AICoachRequest = {
        userId: profile?.user_id ?? null,
        context,
        goal: 'Improve writing by 0.5 band',
      };

      const res = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'AI coach failed');
      }

      const json = (await res.json()) as AICoachResponse;
      setResponse(json);
    } catch (e: any) {
      setError(e?.message ?? 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  const handleRun = async () => {
    setRunning(true);
    await runCoach();
    setRunning(false);
  };

  const handleDoSuggestion = async (id: string) => {
    // Simple action: send an event and optionally open Study Buddy for that suggestion
    try {
      await fetch('/api/ai/coach/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionId: id, userId: profile?.user_id ?? null }),
      });
      if (onOpenStudyBuddy) onOpenStudyBuddy();
    } catch (_) {
      // ignore
    }
  };

  return (
    <div className="bg-card rounded-ds-2xl shadow-lg max-h-[80vh] overflow-auto">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h3 className="font-slab text-h3">AI Coach</h3>
          <div className="text-sm text-muted-foreground">Personalized feedback & next-step micro-actions</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="text-sm px-3 py-1 rounded-ds-lg border"
            onClick={() => {
              setContext('');
              setResponse(null);
            }}
          >
            Reset
          </button>
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <div className="p-4">
        <label className="text-xs text-muted-foreground">Prompt / context</label>
        <textarea
          className="w-full mt-2 p-3 rounded border min-h-[80px] text-sm"
          value={context}
          onChange={(e) => setContext(e.target.value)}
        />

        <div className="flex gap-2 mt-3">
          <button className="btn-primary" onClick={handleRun} disabled={loading || running}>
            {loading ? 'Thinking…' : 'Ask Coach'}
          </button>
          <button className="btn-ghost" onClick={() => { setResponse(null); setError(null); }}>
            Clear
          </button>
        </div>

        {error && <div className="mt-3 text-red-500">{error}</div>}

        {response && (
          <div className="mt-4">
            <div className="text-small text-muted-foreground">Summary</div>
            <div className="mt-2 p-3 rounded bg-muted/40">{response.summary}</div>

            <div className="mt-4">
              <h4 className="font-semibold">Suggestions</h4>
              <ul className="mt-2 space-y-2">
                {response.suggestions.map((s) => (
                  <li key={s.id} className="p-3 rounded border">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium">{s.title}</div>
                        {s.detail && <div className="text-sm text-muted-foreground mt-1">{s.detail}</div>}
                        {s.estimatedMinutes && (
                          <div className="text-xs text-muted-foreground mt-1">~{s.estimatedMinutes} mins</div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <button className="btn" onClick={() => handleDoSuggestion(s.id)}>
                          Do it
                        </button>
                        <button className="btn-ghost" onClick={() => navigator.clipboard?.writeText(s.title)}>
                          Copy
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {response.reasoning && (
              <div className="mt-4">
                <div className="text-small text-muted-foreground">How the coach thought</div>
                <pre className="mt-2 p-3 rounded bg-muted/20 text-xs overflow-auto">{response.reasoning}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
