import Link from 'next/link';

import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { ReadingStatsCard } from '@/components/reading/ReadingStatsCard';
import QuickDrillButton from '@/components/quick/QuickDrillButton';

type QuickActionsSectionProps = {
  speakingVocabSlug: string;
  onShareDashboard: () => void;
};

export function QuickActionsSection({
  speakingVocabSlug,
  onShareDashboard,
}: QuickActionsSectionProps) {
  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_.9fr]">
      <Card className="rounded-ds-2xl p-6">
        <h2 className="font-slab text-h2">Quick actions</h2>
        <p className="mt-1 text-grayish">Jump back in with one click.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <QuickDrillButton />
          <Link href="/learning">
            <Button variant="primary" className="rounded-ds-xl">
              Start today&apos;s lesson
            </Button>
          </Link>
          <Link href="/mock">
            <Button variant="secondary" className="rounded-ds-xl">
              Take a mock test
            </Button>
          </Link>
          <Link href="/writing">
            <Button variant="accent" className="rounded-ds-xl">
              Practice writing
            </Button>
          </Link>
          <Link href="/reading">
            <Button variant="secondary" className="rounded-ds-xl">
              Practice reading
            </Button>
          </Link>
          <Link href={`/vocabulary/speaking/${speakingVocabSlug}`}>
            <Button variant="secondary" className="rounded-ds-xl">
              Speaking vocab today
            </Button>
          </Link>
          <Link href="/progress">
            <Button variant="ghost" className="rounded-ds-xl">
              Review progress report
            </Button>
          </Link>
          <Link href="#visa-target">
            <Button variant="ghost" className="rounded-ds-xl">
              Check visa target
            </Button>
          </Link>
          <Button onClick={onShareDashboard} variant="secondary" className="rounded-ds-xl">
            Share progress
          </Button>
        </div>
      </Card>

      <ReadingStatsCard />
    </div>
  );
}
