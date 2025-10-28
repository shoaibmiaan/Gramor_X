import { useMemo } from 'react';

import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import type { EvidenceSuggestion } from '@/lib/writing/crossModule';

interface EvidenceSuggestionsPanelProps {
  suggestions: EvidenceSuggestion[];
  loading?: boolean;
  onInsert: (text: string) => void;
  onRefresh?: () => void;
}

export function EvidenceSuggestionsPanel({ suggestions, loading, onInsert, onRefresh }: EvidenceSuggestionsPanelProps) {
  const hasSuggestions = suggestions.length > 0;
  const topSuggestions = useMemo(() => suggestions.slice(0, 4), [suggestions]);

  return (
    <Card className="card-surface space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-foreground">Evidence suggestions</h3>
          <p className="text-xs text-muted-foreground">Reuse facts from recent reading passages to strengthen your Task 2 arguments.</p>
        </div>
        {onRefresh && (
          <Button size="xs" variant="ghost" onClick={() => onRefresh()} loading={loading}>
            Refresh
          </Button>
        )}
      </div>
      {hasSuggestions ? (
        <ul className="space-y-3">
          {topSuggestions.map((item) => (
            <li key={`${item.sourceSlug}-${item.statement}`} className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
              <p className="text-sm text-foreground">{item.statement}</p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <Badge size="xs" variant="soft" tone="info">
                  {item.sourceTitle}
                </Badge>
                <Button size="xs" variant="outline" onClick={() => onInsert(item.statement)}>
                  Insert into draft
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Complete a reading passage to unlock tailored evidence suggestions.</p>
      )}
    </Card>
  );
}
