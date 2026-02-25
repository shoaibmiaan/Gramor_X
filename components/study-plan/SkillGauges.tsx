import React from 'react';
import { Card } from '@/components/design-system/Card';
import { cn } from '@/lib/utils';

export interface SkillScore {
  name: string;
  current: number; // 0-9
  target: number;  // 0-9
}

interface SkillGaugesProps {
  skills: SkillScore[];
  className?: string;
}

const getPercentage = (current: number, target: number): number => {
  if (target <= 0) return 0;
  const percent = (current / target) * 100;
  return Math.min(100, Math.max(0, percent));
};

const getColorClass = (percent: number): string => {
  if (percent < 30) return 'bg-red-500';
  if (percent < 60) return 'bg-yellow-500';
  if (percent < 80) return 'bg-blue-500';
  return 'bg-green-500';
};

export const SkillGauges: React.FC<SkillGaugesProps> = ({ skills, className }) => {
  return (
    <Card className={`p-4 ${className}`}>
      <h3 className="mb-3 text-sm font-semibold">Progress to target</h3>
      <div className="space-y-3">
        {skills.map((skill) => {
          const percent = getPercentage(skill.current, skill.target);
          const colorClass = getColorClass(percent);
          return (
            <div key={skill.name}>
              <div className="flex items-center justify-between text-xs">
                <span className="capitalize">{skill.name}</span>
                <span className="text-muted-foreground">
                  {skill.current.toFixed(1)} / {skill.target.toFixed(1)}
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full transition-all', colorClass)}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};