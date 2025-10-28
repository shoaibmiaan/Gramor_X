import { useCallback, useState } from 'react';

import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import type { LiveSuggestion } from '@/lib/writing/languageTools';

export type LiveCritiquePanelProps = {
  text: string;
  disabled?: boolean;
  onApply: (suggestion: LiveSuggestion) => void;
};

export const LiveCritiquePanel = ({ text, disabled, onApply }: LiveCritiquePanelProps) => {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<LiveSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const runCritique = useCallback(async () => {
    if (!text.trim()) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/writing/critique/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? 'Unable to fetch critique');
      }
      const payload = (await response.json()) as { suggestions: LiveSuggestion[] };
      setSuggestions(payload.suggestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch critique');
    } finally {
      setLoading(false);
    }
  }, [text]);

  return (
    <Card className="space-y-4" padding="lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Live critique</h2>
          <p className="text-sm text-muted-foreground">Paragraph-level nudges to keep tone and cohesion sharp.</p>
        </div>
        <Button size="sm" variant="outline" onClick={runCritique} disabled={disabled || loading}>
          {loading ? (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary" aria-hidden />
              Analyzing…
            </span>
          ) : (
            'Refresh critique'
          )}
        </Button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {suggestions.length === 0 && !loading ? (
        <p className="text-sm text-muted-foreground">Run a critique to surface cohesion and clarity suggestions.</p>
      ) : (
        <ul className="space-y-3">
          {suggestions.map((item, index) => (
            <li key={`${item.paragraphIndex}-${index}`} className="rounded-2xl border border-border/60 bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant="soft" tone="info" size="sm">
                  Paragraph {item.paragraphIndex + 1}
                </Badge>
                <span className="text-sm font-medium text-foreground">{item.issue}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{item.suggestion}</p>
              {item.reasoning && <p className="mt-2 text-xs text-muted-foreground">Why: {item.reasoning}</p>}
              {item.example && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Example: <span className="text-foreground">{item.example}</span>
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="xs" onClick={() => onApply(item)} disabled={disabled}>
                  Apply suggestion
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};
