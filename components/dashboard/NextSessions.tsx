import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import type { DayTask } from '@/types/study-plan';

interface NextSessionsProps {
  tasks: DayTask[];
  fallbackTitle?: string;
  viewAllHref?: string;
}

export const NextSessions: React.FC<NextSessionsProps> = ({
  tasks,
  fallbackTitle = 'Next lessons',
  viewAllHref = '/study-plan',
}) => {
  if (!tasks.length) return null;

  return (
    <div className="mt-10" id="next-sessions">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-slab text-h2">{fallbackTitle}</h2>
          <p className="text-small text-grayish">
            Work through these in order to stay aligned with your goal.
          </p>
        </div>
        <Link
          href={viewAllHref}
          className="text-small font-medium text-primary underline-offset-4 hover:underline"
        >
          View full plan
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {tasks.map((task) => (
          <Card key={task.id} className="flex flex-col rounded-ds-2xl p-6">
            <h3 className="mb-2 font-slab text-h3">{task.title}</h3>
            <p className="text-sm text-muted-foreground">{task.description}</p>
            <div className="mt-auto pt-4">
              <Link href={`/learn/${task.id}`} className="inline-block w-full">
                <Button variant="primary" className="w-full rounded-ds-xl">
                  Start
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};