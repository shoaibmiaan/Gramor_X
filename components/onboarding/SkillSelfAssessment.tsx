import React from 'react';
import { cn } from '@/lib/utils';

export type Skill = 'reading' | 'writing' | 'listening' | 'speaking';
export type Score = 0 | 0.5 | 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 4.5 | 5 | 5.5 | 6 | 6.5 | 7 | 7.5 | 8 | 8.5 | 9;

const SCORES: Score[] = [
  0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9,
];

interface SkillSelfAssessmentProps {
  value: Record<Skill, Score | null>;
  onChange: (skill: Skill, score: Score) => void;
  disabled?: boolean;
  className?: string;
}

export const SkillSelfAssessment: React.FC<SkillSelfAssessmentProps> = ({
  value,
  onChange,
  disabled = false,
  className,
}) => {
  const skills: Skill[] = ['reading', 'writing', 'listening', 'speaking'];

  return (
    <div className={cn('space-y-6', className)}>
      {skills.map((skill) => (
        <div key={skill} className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium capitalize">{skill}</label>
            <span className="text-xs text-muted-foreground">
              {value[skill] !== null ? `Band ${value[skill]}` : 'Not set'}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {SCORES.map((score) => (
              <button
                key={score}
                type="button"
                onClick={() => onChange(skill, score)}
                disabled={disabled}
                className={cn(
                  'h-8 w-8 rounded-md border text-xs font-medium transition-all',
                  value[skill] === score
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card hover:border-primary/50',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {score}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};