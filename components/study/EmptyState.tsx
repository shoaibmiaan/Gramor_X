import React from 'react';
import { EmptyState as DSEmptyState } from '@/components/design-system/EmptyState';
import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';

export type PlanPreset = {
  id: string;
  title: string;
  description: string;
  weeks: number;
  highlight?: string;
};

type Props = {
  presets: PlanPreset[];
  onSelect: (preset: PlanPreset) => void;
  loadingId: string | null;
  disabled?: boolean;
};

export const StudyPlanEmptyState: React.FC<Props> = ({ presets, onSelect, loadingId, disabled }) => {
  return (
    <div className="space-y-6">
      <DSEmptyState
        title="Build your personalised study plan"
        description="Pick a starting point and we will generate a balanced mix of IELTS practice across all four skills."
        icon={<Icon name="fire" size={28} title="Streak" />}
        actions={
          <span className="text-small text-muted-foreground">
            Plans auto-adjust after you complete a day.
          </span>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelect(preset)}
            disabled={disabled}
            className={[
              'group flex flex-col items-start gap-3 rounded-ds-2xl border border-border bg-card p-5 text-left transition',
              'hover:border-primary/60 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              'disabled:cursor-not-allowed disabled:opacity-70',
            ].join(' ')}
          >
            <div className="flex w-full items-center justify-between">
              <div>
                <p className="font-slab text-h4 text-foreground">{preset.title}</p>
                <p className="mt-1 text-small text-muted-foreground">{preset.description}</p>
              </div>
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon name="book" size={18} aria-hidden />
              </span>
            </div>

            <div className="mt-auto w-full">
              <Button
                variant="soft"
                tone="primary"
                size="sm"
                className="w-full"
                loading={loadingId === preset.id}
                loadingText="Creating..."
              >
                Start {preset.weeks}-week plan
              </Button>
              {preset.highlight && (
                <p className="mt-2 text-xs font-medium uppercase tracking-wide text-primary/80">
                  {preset.highlight}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default StudyPlanEmptyState;
