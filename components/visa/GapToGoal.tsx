import React, { useEffect, useState } from 'react';
import Link from 'next/link';

import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
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

  const gap = target.target_band - (currentBand ?? 0);

  return (
    <Card className="space-y-4 rounded-ds-2xl p-6">
      <div>
        <h3 className="font-slab text-h3">Visa Target</h3>
        <p className="text-body mt-1">
          {target.institution}: band {target.target_band}
        </p>
        {currentBand !== null && (
          <p className="mt-2 text-body">
            Gap to goal: {gap <= 0 ? 'achieved' : gap.toFixed(1)}
          </p>
        )}
        {target.deadline && (
          <p className="mt-1 text-small opacity-80">
            Deadline: {new Date(target.deadline).toLocaleDateString()}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/reports" className="inline-flex">
          <Button variant="soft" tone="info" size="sm" className="rounded-ds-xl">
            Review latest scores
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
