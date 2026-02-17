import type { EvidenceSuggestion, HedgingSuggestion } from '@/lib/writing/crossModule';
import type { LiveSuggestion } from '@/lib/writing/languageTools';
import { CohesionHeatmapPanel } from './CohesionHeatmapPanel';
import { EvidenceSuggestionsPanel } from './EvidenceSuggestionsPanel';
import { HedgingAlertsPanel } from './HedgingAlertsPanel';
import { LexicalTrackerPanel } from './LexicalTrackerPanel';
import { LiveCritiquePanel } from './LiveCritiquePanel';
import { PaperUploadPanel } from './PaperUploadPanel';
import { ParaphraseStudio } from './ParaphraseStudio';

export type LanguageToolsDockProps = {
  text: string;
  timeSpentMs: number;
  onApplySuggestion: (suggestion: LiveSuggestion) => void;
  onInsertParaphrase: (sentence: string) => void;
  evidence?: EvidenceSuggestion[];
  onInsertEvidence?: (text: string) => void;
  onRefreshEvidence?: () => void;
  evidenceLoading?: boolean;
  hedging?: HedgingSuggestion[];
  attemptId: string | null;
  onInsertHandwriting: (payload: { text: string; legibility: number }) => void;
  disabled?: boolean;
};

export const LanguageToolsDock = ({
  text,
  timeSpentMs,
  onApplySuggestion,
  onInsertParaphrase,
  evidence,
  onInsertEvidence,
  onRefreshEvidence,
  evidenceLoading,
  hedging,
  attemptId,
  onInsertHandwriting,
  disabled,
}: LanguageToolsDockProps) => {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <LiveCritiquePanel text={text} onApply={onApplySuggestion} disabled={disabled} />
      <LexicalTrackerPanel text={text} timeSpentMs={timeSpentMs} />
      <ParaphraseStudio onInsert={onInsertParaphrase} />
      <CohesionHeatmapPanel text={text} />
      {evidence && onInsertEvidence && (
        <EvidenceSuggestionsPanel
          suggestions={evidence}
          loading={evidenceLoading}
          onInsert={onInsertEvidence}
          onRefresh={onRefreshEvidence}
        />
      )}
      {hedging && hedging.length > 0 && <HedgingAlertsPanel suggestions={hedging} />}
      <PaperUploadPanel attemptId={attemptId} onInsert={onInsertHandwriting} />
    </div>
  );
};
