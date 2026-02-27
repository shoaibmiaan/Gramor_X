import { useCallback, useEffect, useState } from 'react';

import { Badge } from '@/components/design-system/Badge';
import { Card } from '@/components/design-system/Card';
import type { CohesionHeatmapEntry } from '@/lib/writing/languageTools';

export type CohesionHeatmapPanelProps = {
  text: string;
};

export const CohesionHeatmapPanel = ({ text }: CohesionHeatmapPanelProps) => {
  const [heatmap, setHeatmap] = useState<CohesionHeatmapEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const runHeatmap = useCallback(async () => {
    if (!text.trim()) {
      setHeatmap([]);
      return;
    }
    try {
      const response = await fetch('/api/writing/cohesion/heatmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? 'Unable to compute cohesion heatmap');
      }
      const payload = (await response.json()) as { heatmap: CohesionHeatmapEntry[] };
      setHeatmap(payload.heatmap);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to compute cohesion heatmap');
    }
  }, [text]);

  useEffect(() => {
    const debounce = window.setTimeout(() => {
      void runHeatmap();
    }, 2000);
    return () => window.clearTimeout(debounce);
  }, [runHeatmap]);

  return (
    <Card className="space-y-4" padding="lg">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">Cohesion heatmap</h2>
        <p className="text-sm text-muted-foreground">See which linkers dominate your essay and where to diversify them.</p>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {heatmap.length === 0 ? (
        <p className="text-sm text-muted-foreground">Write a paragraph or two, then refresh to reveal cohesion patterns.</p>
      ) : (
        <ul className="space-y-3">
          {heatmap.map((entry) => (
            <li key={entry.marker} className="rounded-2xl border border-border/60 bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant="soft" tone="info" size="sm">
                  {entry.marker}
                </Badge>
                <span className="text-sm text-muted-foreground">{entry.count} use{entry.count === 1 ? '' : 's'}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Appears in sentence{entry.sentences.length === 1 ? '' : 's'} {entry.sentences.map((index) => index + 1).join(', ')}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};
