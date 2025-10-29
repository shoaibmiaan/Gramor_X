import { Card } from '@/components/design-system/Card';
import type { HedgingSuggestion } from '@/lib/writing/crossModule';

interface HedgingAlertsPanelProps {
  suggestions: HedgingSuggestion[];
}

export function HedgingAlertsPanel({ suggestions }: HedgingAlertsPanelProps) {
  const hasSuggestions = suggestions.length > 0;
  return (
    <Card className="card-surface space-y-4 p-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">Speaking fillers to tighten</h3>
        <p className="text-xs text-muted-foreground">Trim hedging phrases you frequently use when speaking to sound more decisive in writing.</p>
      </div>
      {hasSuggestions ? (
        <ul className="space-y-3">
          {suggestions.map((suggestion) => (
            <li key={suggestion.phrase} className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2 text-sm text-foreground">
                <span className="font-medium capitalize">{suggestion.phrase}</span>
                <span className="text-xs text-muted-foreground">{suggestion.count}× last week</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{suggestion.tip}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Nice! Recent speaking attempts didn’t overuse hedging phrases.</p>
      )}
    </Card>
  );
}
