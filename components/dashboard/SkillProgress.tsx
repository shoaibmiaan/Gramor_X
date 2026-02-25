import React from 'react';
import { SkillGauges } from '@/components/study-plan/SkillGauges';
import type { SkillScore } from '@/types/study-plan';

interface SkillProgressProps {
  skillScores: SkillScore[] | null;
}

export const SkillProgress: React.FC<SkillProgressProps> = ({ skillScores }) => {
  if (!skillScores) return null;
  return (
    <div className="mt-6">
      <SkillGauges skills={skillScores} />
    </div>
  );
};