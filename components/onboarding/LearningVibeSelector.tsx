import React from 'react';
import { Icon } from '@/components/design-system/Icon';
import { cn } from '@/lib/utils';

export type LearningStyle = 'video' | 'tips' | 'practice' | 'flashcards';

interface VibeOption {
  value: LearningStyle;
  label: string;
  icon: string;
  description: string;
  image?: string; // optional custom image path
}

const DEFAULT_OPTIONS: VibeOption[] = [
  {
    value: 'video',
    label: 'Video lessons',
    icon: 'video',
    description: 'Learn through engaging video explanations.',
  },
  {
    value: 'tips',
    label: 'Quick tips',
    icon: 'lightbulb',
    description: 'Bite-sized strategies and advice.',
  },
  {
    value: 'practice',
    label: 'Practice tests',
    icon: 'file-text',
    description: 'Simulate real exam conditions.',
  },
  {
    value: 'flashcards',
    label: 'Flashcards',
    icon: 'layers',
    description: 'Memorize vocabulary and key concepts.',
  },
];

interface LearningVibeSelectorProps {
  value: LearningStyle | null;
  onChange: (style: LearningStyle) => void;
  options?: VibeOption[]; // allow custom options
  disabled?: boolean;
  className?: string;
  layout?: 'grid' | 'list';
}

export const LearningVibeSelector: React.FC<LearningVibeSelectorProps> = ({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  disabled = false,
  className,
  layout = 'grid',
}) => {
  return (
    <div
      className={cn(
        layout === 'grid' ? 'grid gap-4 sm:grid-cols-2' : 'flex flex-col gap-3',
        className
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          disabled={disabled}
          className={cn(
            'flex items-start gap-3 rounded-2xl border p-5 text-left transition-all',
            value === option.value
              ? 'border-primary bg-primary/10 shadow-md'
              : 'border-border bg-card hover:border-primary/50',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {option.image ? (
            <img src={option.image} alt={option.label} className="h-10 w-10 object-contain" />
          ) : (
            <div className="rounded-full bg-primary/10 p-2">
              <Icon name={option.icon} className="h-5 w-5 text-primary" />
            </div>
          )}
          <div className="flex-1">
            <span className="font-semibold">{option.label}</span>
            <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
};