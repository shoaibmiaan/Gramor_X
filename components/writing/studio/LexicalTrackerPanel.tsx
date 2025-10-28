import { useCallback, useEffect, useState } from 'react';

import { Badge } from '@/components/design-system/Badge';
import { Card } from '@/components/design-system/Card';
import { ProgressBar } from '@/components/design-system/ProgressBar';
import type { LexicalReport } from '@/lib/writing/languageTools';

export type LexicalTrackerPanelProps = {
  text: string;
  timeSpentMs: number;
};

const ttrTargets = [
  { label: 'Band 7', value: 0.45 },
  { label: 'Band 8', value: 0.5 },
];

export const LexicalTrackerPanel = ({ text, timeSpentMs }: LexicalTrackerPanelProps) => {
  const [report, setReport] = useState<LexicalReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runReport = useCallback(async () => {
    if (!text.trim()) {
      setReport({ wordCount: 0, typeTokenRatio: 0, rareWordDensity: 0, fillerCount: 0, wordsPerMinute: 0 });
      return;
    }
    try {
      const response = await fetch('/api/writing/lexical/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, timeSpentMs }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? 'Unable to compute lexical report');
      }
      const payload = (await response.json()) as { report: LexicalReport };
      setReport(payload.report);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to compute lexical report');
    }
  }, [text, timeSpentMs]);

  useEffect(() => {
    const debounce = window.setTimeout(() => {
      void runReport();
    }, 1500);
    return () => window.clearTimeout(debounce);
  }, [runReport]);

  return (
    <Card className="space-y-4" padding="lg">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">Lexical variety tracker</h2>
        <p className="text-sm text-muted-foreground">Monitor vocabulary range, rare word usage, and pacing.</p>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {report && (
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">Type-token ratio</span>
            <Badge variant="soft" tone={report.typeTokenRatio >= 0.5 ? 'success' : 'warning'} size="sm">
              {report.typeTokenRatio.toFixed(2)}
            </Badge>
          </div>
          <ProgressBar value={report.typeTokenRatio * 100} ariaLabel="Type-token ratio" />
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {ttrTargets.map((target) => (
              <span key={target.label}>{target.label}: {target.value.toFixed(2)}</span>
            ))}
          </div>
          <div className="grid gap-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Words per minute</span>
              <span className="text-foreground">{report.wordsPerMinute.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span>Rare word density</span>
              <span className="text-foreground">{(report.rareWordDensity * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Filler words spotted</span>
              <span className="text-foreground">{report.fillerCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Word count</span>
              <span className="text-foreground">{report.wordCount}</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
