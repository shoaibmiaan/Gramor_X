import type { LiveSuggestion } from '@/lib/writing/languageTools';
import { CohesionHeatmapPanel } from './CohesionHeatmapPanel';
import { LexicalTrackerPanel } from './LexicalTrackerPanel';
import { LiveCritiquePanel } from './LiveCritiquePanel';
import { ParaphraseStudio } from './ParaphraseStudio';

export type LanguageToolsDockProps = {
  text: string;
  timeSpentMs: number;
  onApplySuggestion: (suggestion: LiveSuggestion) => void;
  onInsertParaphrase: (sentence: string) => void;
  disabled?: boolean;
};

export const LanguageToolsDock = ({
  text,
  timeSpentMs,
  onApplySuggestion,
  onInsertParaphrase,
  disabled,
}: LanguageToolsDockProps) => {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <LiveCritiquePanel text={text} onApply={onApplySuggestion} disabled={disabled} />
      <LexicalTrackerPanel text={text} timeSpentMs={timeSpentMs} />
      <ParaphraseStudio onInsert={onInsertParaphrase} />
      <CohesionHeatmapPanel text={text} />
    </div>
  );
};
