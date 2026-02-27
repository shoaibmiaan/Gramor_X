import {
  CartesianGrid,
  Label,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { SubscriptionTier } from '@/lib/navigation/types';
import type { BandHistoryPoint } from '@/hooks/useDashboardData';

type BandProgressProps = {
  points: BandHistoryPoint[];
  targetBand: number;
  tier: SubscriptionTier;
};

const BandProgress = ({ points, targetBand, tier }: BandProgressProps) => {
  const canShowConfidenceInterval = tier === 'rocket' || tier === 'owl';
  const canShowAnnotations = tier === 'owl';

  return (
    <section id="performance" className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-foreground">Band Progress</h3>
        <p className="text-xs text-muted-foreground">Weekly trajectory against your target band.</p>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 12, right: 24, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
            <XAxis dataKey="weekLabel" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 9]} tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: number) => [`Band ${value.toFixed(1)}`, 'Score']}
              labelFormatter={(label) => `Week: ${String(label)}`}
            />
            <Legend />
            <ReferenceLine y={targetBand} stroke="#f97316" strokeDasharray="4 4">
              <Label value={`Target ${targetBand.toFixed(1)}`} position="insideTopRight" />
            </ReferenceLine>

            {canShowConfidenceInterval && (
              <>
                <Line
                  type="monotone"
                  dataKey="upperBand"
                  stroke="#93c5fd"
                  strokeDasharray="4 4"
                  dot={false}
                  name="Upper confidence"
                />
                <Line
                  type="monotone"
                  dataKey="lowerBand"
                  stroke="#93c5fd"
                  strokeDasharray="4 4"
                  dot={false}
                  name="Lower confidence"
                />
              </>
            )}

            <Line
              type="monotone"
              dataKey="band"
              stroke="#6366f1"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name="Band"
            />

            {canShowAnnotations &&
              points
                .filter((point) => point.note)
                .map((point) => (
                  <ReferenceLine
                    key={`annotation-${point.id}`}
                    x={point.weekLabel}
                    stroke="#22c55e"
                    strokeDasharray="2 2"
                  >
                    <Label value={point.note as string} position="top" fontSize={10} />
                  </ReferenceLine>
                ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};

export default BandProgress;
