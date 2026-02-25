import type { ChangeEvent } from 'react';

import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Input } from '@/components/design-system/Input';
import { Select } from '@/components/design-system/Select';
import { Toggle } from '@/components/design-system/Toggle';
import type { PlanId } from '@/types/pricing';
import type { PromptDifficulty, PromptPart } from '@/types/speakingPrompts';

export type PromptFilters = {
  q: string;
  part: PromptPart | 'all';
  difficulty: PromptDifficulty | 'all';
  tag: string;
  bookmarkedOnly: boolean;
};

interface SpeakingFilterBarProps {
  value: PromptFilters;
  onChange: (value: PromptFilters) => void;
  onRandomClick: () => void;
  randomLoading?: boolean;
  plan: PlanId;
  signedIn: boolean;
}

const PART_OPTIONS: Array<{ label: string; value: PromptFilters['part'] }> = [
  { label: 'All parts', value: 'all' },
  { label: 'Part 1', value: 'p1' },
  { label: 'Part 2', value: 'p2' },
  { label: 'Part 3', value: 'p3' },
  { label: 'Interview', value: 'interview' },
  { label: 'Scenario', value: 'scenario' },
];

const DIFFICULTY_OPTIONS: Array<{ label: string; value: PromptFilters['difficulty'] }> = [
  { label: 'All levels', value: 'all' },
  { label: 'B1', value: 'B1' },
  { label: 'B2', value: 'B2' },
  { label: 'C1', value: 'C1' },
  { label: 'C2', value: 'C2' },
];

export function SpeakingFilterBar({
  value,
  onChange,
  onRandomClick,
  randomLoading,
  plan,
  signedIn,
}: SpeakingFilterBarProps) {
  const update = (partial: Partial<PromptFilters>) => onChange({ ...value, ...partial });

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value: nextValue } = event.target;
    if (name === 'search') {
      update({ q: nextValue });
    }
    if (name === 'tag') {
      update({ tag: nextValue });
    }
  };

  const hintLabel = plan === 'free' ? 'Starter+' : plan === 'starter' ? 'Booster+' : null;

  return (
    <Card className="flex flex-col gap-4" padding="lg">
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <Input
          name="search"
          label="Search topics"
          placeholder="technology, travel, pronunciation…"
          value={value.q}
          onChange={handleInput}
          className="md:max-w-sm"
        />
        <Select
          label="Part"
          value={value.part}
          onChange={(event) => update({ part: event.target.value as PromptFilters['part'] })}
          options={PART_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
          className="md:max-w-[160px]"
        />
        <Select
          label="Difficulty"
          value={value.difficulty}
          onChange={(event) => update({ difficulty: event.target.value as PromptFilters['difficulty'] })}
          options={DIFFICULTY_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
          className="md:max-w-[140px]"
        />
        <Input
          name="tag"
          label="Tag filter"
          placeholder="technology, band7+"
          value={value.tag}
          onChange={handleInput}
          helperText="Use commas to combine tags"
          className="md:max-w-sm"
        />
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Toggle
            checked={value.bookmarkedOnly}
            onChange={(checked) => update({ bookmarkedOnly: checked })}
            label="Bookmarked prompts"
            hint={signedIn ? 'Show saved prompts only' : 'Sign in to save prompts'}
            disabled={!signedIn}
          />
          {hintLabel && (
            <Badge variant="accent">{hintLabel} unlocks premium packs</Badge>
          )}
        </div>

        <Button
          type="button"
          variant="secondary"
          tone="info"
          className="rounded-ds-xl"
          loading={Boolean(randomLoading)}
          onClick={onRandomClick}
        >
          Surprise me
        </Button>
      </div>
    </Card>
  );
}

export default SpeakingFilterBar;
