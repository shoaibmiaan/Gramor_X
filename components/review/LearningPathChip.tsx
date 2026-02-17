import clsx from 'clsx';
import React from 'react';

import type { SkillKey, SkillMix } from '@/types/review';

const LABELS: Record<SkillKey, string> = {
  reading: 'Reading',
  listening: 'Listening',
  writing: 'Writing',
  speaking: 'Speaking',
};

const ABBREV: Record<SkillKey, string> = {
  reading: 'R',
  listening: 'L',
  writing: 'W',
  speaking: 'S',
};

const ORDER: SkillKey[] = ['reading', 'listening', 'writing', 'speaking'];

type Props = {
  skillMix: SkillMix;
  focusSkills: SkillKey[];
  className?: string;
};

export function LearningPathChip({ skillMix, focusSkills, className }: Props) {
  const total = ORDER.reduce((sum, skill) => sum + (skillMix[skill] ?? 0), 0);

  return (
    <div
      className={clsx(
        'inline-flex items-center gap-3 rounded-full border border-border/70 bg-card/80 px-4 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm backdrop-blur-sm',
        className,
      )}
      aria-label="Learning path skill mix"
    >
      <span className="uppercase tracking-wide">Learning Path</span>
      <span className="h-4 w-px bg-border/60" aria-hidden />
      <ul className="flex items-center gap-2">
        {ORDER.map((skill) => {
          const count = skillMix[skill] ?? 0;
          const highlighted = focusSkills.includes(skill) || count > 0;
          const percent = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <li key={skill} className="flex items-center gap-1">
              <span
                className={clsx(
                  'inline-flex h-6 w-6 items-center justify-center rounded-full border text-[11px]',
                  highlighted
                    ? 'border-primary/50 bg-primary/10 text-primary'
                    : 'border-border/70 bg-muted/40 text-muted-foreground',
                )}
                aria-hidden
              >
                {ABBREV[skill]}
              </span>
              <span className="sr-only">
                {LABELS[skill]} {count} due ({percent}% of session)
              </span>
              <span className="hidden text-[11px] text-muted-foreground sm:inline">{count}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default LearningPathChip;
