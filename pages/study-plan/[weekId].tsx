import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';
import { Skeleton } from '@/components/design-system/Skeleton';
import { getStudyPlan } from '@/lib/studyPlan';
import type { StudyPlan, Week } from '@/types/study-plan';

const WeekDetailPage: NextPage = () => {
  const router = useRouter();
  const { weekId } = router.query;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [week, setWeek] = useState<Week | null>(null);

  useEffect(() => {
    if (!weekId || typeof weekId !== 'string') return;

    const fetchWeek = async () => {
      setLoading(true);
      setError(null);
      try {
        const plan = await getStudyPlan();
        if (!plan) throw new Error('No study plan found');

        const foundWeek = plan.weeks.find((w) => w.id === weekId);
        if (!foundWeek) throw new Error('Week not found');

        setWeek(foundWeek);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load week details');
      } finally {
        setLoading(false);
      }
    };

    fetchWeek();
  }, [weekId]);

  if (loading) {
    return (
      <Container className="py-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Container>
    );
  }

  if (error || !week) {
    return (
      <Container className="py-8">
        <Card className="p-6 text-center">
          <Icon name="alert-circle" className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-lg font-semibold">Error</h2>
          <p className="mt-2 text-muted-foreground">{error || 'Week not found'}</p>
          <Button className="mt-4" onClick={() => router.push('/study-plan')}>
            Back to study plan
          </Button>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="py-8">
      {/* Back button */}
      <div className="mb-4">
        <Link href="/study-plan" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <Icon name="arrow-left" className="mr-1 h-4 w-4" />
          Back to study plan
        </Link>
      </div>

      {/* Week header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Week {week.number}</h1>
        {week.dateRange && (
          <p className="text-sm text-muted-foreground">{week.dateRange}</p>
        )}
        {week.focus && (
          <p className="mt-2 text-sm">
            <span className="font-medium">Focus:</span> {week.focus}
          </p>
        )}
      </div>

      {/* Tasks by day */}
      <div className="grid gap-4">
        {week.days.map((day) => (
          <Card key={day.day} className="p-4">
            <h3 className="mb-3 text-lg font-semibold">{day.day}</h3>
            <div className="space-y-2">
              {day.tasks.map((task, idx) => (
                <div key={idx} className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <div className="rounded-full bg-primary/10 p-1.5">
                    <Icon name={task.icon || 'file'} className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground">{task.description}</p>
                  </div>
                  {task.completed ? (
                    <div className="rounded-full bg-green-100 p-1 dark:bg-green-900">
                      <Icon name="check" className="h-4 w-4 text-green-600 dark:text-green-300" />
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" className="text-xs">
                      Start
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </Container>
  );
};

export default WeekDetailPage;