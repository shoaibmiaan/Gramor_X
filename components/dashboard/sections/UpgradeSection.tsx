import Link from 'next/link';

import { Alert } from '@/components/design-system/Alert';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';

type UpgradeSectionProps = {
  aiNotes: string[];
};

export function UpgradeSection({ aiNotes }: UpgradeSectionProps) {
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
        {aiNotes.length ? (
          <ul className="mt-3 list-disc pl-6 text-body">
            {aiNotes.map((note, i) => (
              <li key={i}>{note}</li>
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
}
