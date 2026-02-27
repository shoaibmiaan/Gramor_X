import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import type { StudyPlan } from '@/types/study-plan';
import type { AIPlan } from '@/types/profile';

interface UpgradeCoachNotesProps {
  subscriptionTier: string;
  aiPlan?: StudyPlan | null;
  aiLegacy?: AIPlan;
}

export const UpgradeCoachNotes: React.FC<UpgradeCoachNotesProps> = ({
  subscriptionTier,
  aiPlan,
  aiLegacy,
}) => {
  return (
    <div className="mt-10 grid gap-6 md:grid-cols-2">
      <Card className="rounded-ds-2xl p-6">
        <h3 className="mb-2 font-slab text-h3">Upgrade to Rocket 🚀</h3>
        <p className="text-body opacity-90">
          Unlock AI deep feedback, speaking evaluator, and full analytics.
        </p>
        <div className="mt-4">
          <Link href="/pricing">
            <Button variant="primary" className="rounded-ds-xl">
              See Plans
            </Button>
          </Link>
        </div>
      </Card>

      <Card className="rounded-ds-2xl p-6">
        <h3 className="font-slab text-h3">Coach Notes</h3>
        {aiPlan?.recommendations && aiPlan.recommendations.length > 0 ? (
          <ul className="mt-3 list-disc pl-6 text-body">
            {aiPlan.recommendations.map((rec, i) => (
              <li key={i}>{rec.description}</li>
            ))}
          </ul>
        ) : Array.isArray(aiLegacy?.notes) && aiLegacy.notes.length ? (
          <ul className="mt-3 list-disc pl-6 text-body">
            {aiLegacy.notes.map((n: string, i: number) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        ) : (
          <Alert variant="info" className="mt-3">
            Add more details in <b>Profile</b> to refine your AI plan.
          </Alert>
        )}
        <div className="mt-4">
          <Link href="/profile/setup">
            <Button variant="secondary" className="rounded-ds-xl">
              Edit Profile
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};