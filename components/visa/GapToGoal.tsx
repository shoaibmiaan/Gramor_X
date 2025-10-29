import React, { useEffect, useState } from 'react';
import Link from 'next/link';

import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { ProgressBar } from '@/components/design-system/ProgressBar';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import type { Profile } from '@/types/profile';

interface VisaTarget {
  user_id: string;
  institution: string;
  target_band: number;
  deadline: string | null;
}

export const GapToGoal: React.FC = () => {
  const [target, setTarget] = useState<VisaTarget | null>(null);
  const [currentBand, setCurrentBand] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabaseBrowser.auth.getUser();
      if (!user) return;

      const [targetRes, profileRes] = await Promise.all([
        supabaseBrowser
          .from('visa_targets')
          .select('user_id, institution, target_band, deadline')
          .eq('user_id', user.id)
          .maybeSingle()
          .returns<VisaTarget>(),
        supabaseBrowser
          .from('profiles')
          .select('goal_band')
          .eq('user_id', user.id)
          .maybeSingle()
          .returns<Pick<Profile, 'goal_band'>>(),
      ]);

      if (targetRes.data) setTarget(targetRes.data);
      if (profileRes.data) setCurrentBand(profileRes.data.goal_band ?? null);
    })();
  }, []);

  if (!target) return null;

  const targetBand = target.target_band ?? 0;
  const hasCurrentScore = typeof currentBand === 'number';
  const latestBand = hasCurrentScore ? currentBand ?? 0 : 0;
  const gap = targetBand - latestBand;
  const progress =
    targetBand > 0 && hasCurrentScore
      ? Math.max(0, Math.min(100, (latestBand / targetBand) * 100))
      : 0;
  const hasAchieved = hasCurrentScore && gap <= 0;

  return (
    <Card className="space-y-4 rounded-ds-2xl p-6">
      <div className="space-y-3">
        <div>
          <h3 className="font-slab text-h3">Visa Target</h3>
          <p className="text-body mt-1">
            {target.institution}: band {target.target_band}
          </p>
        </div>

        <div className="space-y-2">
          <ProgressBar
            value={progress}
            ariaLabel="Progress towards visa band goal"
            label={
              hasCurrentScore
                ? `Band ${latestBand.toFixed(1)} of ${targetBand.toFixed(1)}`
                : `Target band ${targetBand.toFixed(1)}`
            }
          />

          <p className="text-small text-muted-foreground">
            {hasCurrentScore
              ? hasAchieved
                ? 'Great job! You have met the visa requirement. Keep practising to stay sharp.'
                : `You are ${gap.toFixed(1)} bands away from the requirement. Focus your next sessions on the weakest skills to close the gap.`
              : 'Log your latest mock test score so we can show exactly how far you are from the requirement.'}
          </p>

          {target.deadline && (
            <p className="text-small opacity-80">
              Deadline: {new Date(target.deadline).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/progress" className="inline-flex">
          <Button variant="soft" tone="info" size="sm" className="rounded-ds-xl">
            Analyse skill gaps
          </Button>
        </Link>
        <Link href="/study-plan" className="inline-flex">
          <Button variant="soft" tone="primary" size="sm" className="rounded-ds-xl">
            Adjust weekly plan
          </Button>
        </Link>
        <Link href="/visa" className="inline-flex">
          <Button variant="ghost" size="sm" className="rounded-ds-xl">
            Update requirement
          </Button>
        </Link>
      </div>
    </Card>
  );
};

export default GapToGoal;
