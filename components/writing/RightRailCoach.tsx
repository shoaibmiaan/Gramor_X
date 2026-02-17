// components/writing/RightRailCoach.tsx
import React from 'react';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';

type Props = {
  bandTarget?: string;
  wordCount?: number;
  voiceDraftEnabled?: boolean;
  onToggleVoice?: () => void;
  onOpenHelp?: () => void;
};

function progressClass(percent: number) {
  // Quantize to avoid inline styles; 0/25/50/75/100%
  if (percent <= 0) return 'w-0';
  if (percent <= 0.25) return 'w-1/4';
  if (percent <= 0.5) return 'w-2/4';
  if (percent <= 0.75) return 'w-3/4';
  return 'w-full';
}

export default function RightRailCoach({
  bandTarget = '7+',
  wordCount = 0,
  voiceDraftEnabled = false,
  onToggleVoice,
  onOpenHelp,
}: Props) {
  const percent = Math.min(wordCount / 400, 1);
  const widthClass = progressClass(percent);

  return (
    <div className="space-y-3">
      <section className="rounded-2xl border border-border/40 bg-elevated p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">AI Coach</h3>
          <Badge tone="green">Target {bandTarget}</Badge>
        </div>
        <ul className="list-inside list-disc text-sm text-muted-foreground">
          <li>State the overview clearly (Task 1).</li>
          <li>Answer the prompt directly (Task 2) in paragraph form.</li>
          <li>Use varied linking words; avoid repetition.</li>
          <li>Proofread last 2–3 minutes.</li>
        </ul>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="secondary" onClick={onOpenHelp}>Rubric</Button>
          <Button size="sm" variant="ghost">Examples</Button>
        </div>
      </section>

      <section className="rounded-2xl border border-border/40 bg-elevated p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Word count</h3>
          <span className="text-sm text-muted-foreground">{wordCount} words</span>
        </div>

        {/* Progress (no inline styles) */}
        <div className="mt-2 h-2 w-full rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={400} aria-valuenow={Math.min(wordCount, 400)}>
          <div className={`h-2 rounded-full bg-primary transition-all ${widthClass}`} />
        </div>

        <p className="mt-2 text-xs text-muted-foreground">Aim ≥150 (T1) and ≥250 (T2).</p>
      </section>

      <section className="rounded-2xl border border-border/40 bg-elevated p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Voice draft</h3>
          <Badge tone={voiceDraftEnabled ? 'green' : 'yellow'}>
            {voiceDraftEnabled ? 'On' : 'Off'}
          </Badge>
        </div>
        <Button className="mt-3 w-full" variant="secondary" onClick={onToggleVoice}>
          {voiceDraftEnabled ? 'Disable' : 'Enable'}
        </Button>
      </section>

      <section className="rounded-2xl border border-border/40 bg-elevated p-4">
        <Button className="w-full" variant="ghost" onClick={onOpenHelp}>Need help?</Button>
      </section>
    </div>
  );
}
