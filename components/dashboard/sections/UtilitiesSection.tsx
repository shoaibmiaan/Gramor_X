import { Card } from '@/components/design-system/Card';

export function UtilitiesSection({
  whatIfWriting,
  setWhatIfWriting,
  whatIf,
}: {
  whatIfWriting: number;
  setWhatIfWriting: (value: number) => void;
  whatIf?: { predictedBand?: number; uplift?: number };
}) {
  return (
    <section className="mt-12">
      <Card className="p-6" interactive>
        <h2 className="text-base font-semibold">What-if simulator</h2>
        <p className="mt-1 text-xs text-muted-foreground">If Writing improves to:</p>
        <input
          type="range"
          min={4}
          max={9}
          step={0.5}
          value={whatIfWriting}
          onChange={(event) => setWhatIfWriting(Number(event.target.value))}
          className="mt-3 w-full"
        />
        <p className="mt-2 text-sm">
          Writing target: <span className="font-semibold">{whatIfWriting.toFixed(1)}</span>
        </p>
        <p className="mt-1 text-sm">
          Predicted:{' '}
          <span className="font-semibold">
            {typeof whatIf?.predictedBand === 'number' ? whatIf.predictedBand.toFixed(1) : '—'}
          </span>
        </p>
        <p className="mt-1 text-xs text-emerald-600">
          Potential uplift:{' '}
          {typeof whatIf?.uplift === 'number'
            ? `${whatIf.uplift >= 0 ? '+' : ''}${whatIf.uplift.toFixed(2)}`
            : '—'}
        </p>
      </Card>
    </section>
  );
}
