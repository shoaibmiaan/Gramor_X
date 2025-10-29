import { Card } from '@/components/design-system/Card';

export type FeedbackRadialProps = {
  overall: {
    pron: number;
    intonation: number;
    stress: number;
    fluency: number;
    band: number;
    wpm: number;
    fillers: number;
  };
};

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const toneClass: Record<string, string> = {
  pron: 'stroke-primary text-primary',
  intonation: 'stroke-electricBlue text-electricBlue',
  stress: 'stroke-secondary text-secondary',
  fluency: 'stroke-accent text-accent',
};

export function FeedbackRadial({ overall }: FeedbackRadialProps) {
  const metrics = [
    { key: 'pron', label: 'Pronunciation', value: overall.pron },
    { key: 'intonation', label: 'Intonation', value: overall.intonation },
    { key: 'stress', label: 'Word stress', value: overall.stress },
    { key: 'fluency', label: 'Fluency', value: overall.fluency },
  ] as const;

  return (
    <Card className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {metrics.map((metric) => {
          const clamped = Math.max(0, Math.min(1, metric.value ?? 0));
          const dashOffset = CIRCUMFERENCE * (1 - clamped);
          return (
            <div key={metric.key} className="flex flex-col items-center gap-2 text-center">
              <svg
                viewBox="0 0 120 120"
                className="h-28 w-28"
                role="img"
                aria-labelledby={`metric-${metric.key}`}
              >
                <title id={`metric-${metric.key}`}>{metric.label}</title>
                <circle
                  cx="60"
                  cy="60"
                  r={RADIUS}
                  className="fill-none stroke-border/40"
                  strokeWidth="10"
                />
                <circle
                  cx="60"
                  cy="60"
                  r={RADIUS}
                  className={`fill-none transition-all duration-500 ease-out ${toneClass[metric.key]}`}
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  strokeWidth={10}
                  transform="rotate(-90 60 60)"
                />
                <text
                  x="50%"
                  y="52%"
                  dominantBaseline="middle"
                  textAnchor="middle"
                  className="text-lg font-semibold text-foreground"
                >
                  {(clamped * 100).toFixed(0)}%
                </text>
              </svg>
              <span className="text-sm font-medium text-muted-foreground">{metric.label}</span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col justify-center gap-4">
        <div className="rounded-ds-xl border border-border/60 bg-card/70 p-4">
          <p className="text-sm font-medium text-muted-foreground">Band estimate</p>
          <p className="text-3xl font-semibold text-foreground">{overall.band.toFixed(1)}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Based on your current pronunciation and fluency profile. Track how this changes with each reattempt.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-ds-xl border border-border/60 bg-card/70 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Words per minute</p>
            <p className="text-2xl font-semibold text-foreground">{overall.wpm}</p>
            <p className="text-xs text-muted-foreground">Target 140–160 wpm for Part 2 cue cards.</p>
          </div>
          <div className="rounded-ds-xl border border-border/60 bg-card/70 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Fillers detected</p>
            <p className="text-2xl font-semibold text-foreground">{overall.fillers}</p>
            <p className="text-xs text-muted-foreground">Aim for fewer than 3 filler sounds per minute.</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default FeedbackRadial;
