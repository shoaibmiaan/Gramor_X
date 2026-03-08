import type { ComponentType } from 'react';
import Link from 'next/link';

import { Button } from '@/components/design-system/Button';

type CalendarSectionProps = {
  StudyCalendar: ComponentType;
};

export function CalendarSection({ StudyCalendar }: CalendarSectionProps) {
  return (
    <div className="mt-10 space-y-4" id="study-calendar">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-slab text-h2">Weekly momentum</h2>
          <p className="text-grayish">Protect your streak by finishing the scheduled sessions.</p>
        </div>
        <Link href="/study-plan" className="shrink-0">
          <Button variant="ghost" size="sm" className="rounded-ds-xl">
            Adjust schedule
          </Button>
        </Link>
      </div>
      <StudyCalendar />
    </div>
  );
}
