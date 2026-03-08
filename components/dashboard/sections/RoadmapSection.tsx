import Link from 'next/link';

import { GoalRoadmap } from '@/components/feature/GoalRoadmap';
import { Button } from '@/components/design-system/Button';

type RoadmapSectionProps = {
  examDate: string | null;
};

export function RoadmapSection({ examDate }: RoadmapSectionProps) {
  return (
    <div className="mt-10">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-slab text-h2">Roadmap to exam day</h2>
          <p className="text-grayish">See which stage you are in and what to do next.</p>
        </div>
        <Link href="/exam-day" className="shrink-0">
          <Button variant="ghost" size="sm" className="rounded-ds-xl">
            Plan exam day
          </Button>
        </Link>
      </div>
      <GoalRoadmap examDate={examDate} />
    </div>
  );
}
