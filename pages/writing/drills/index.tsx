import { useMemo, useState } from 'react';
import type { GetServerSideProps } from 'next';

import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Container } from '@/components/design-system/Container';
import { EmptyState } from '@/components/design-system/EmptyState';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/design-system/Tabs';
import { allDrills, type Drill } from '@/lib/writing/drills';
import { getServerClient } from '@/lib/supabaseServer';

interface PageProps {
  drills: Drill[];
  completed: string[];
}

const criteriaLabels: Record<Drill['criterion'], string> = {
  TR: 'Task Response',
  CC: 'Coherence & Cohesion',
  LR: 'Lexical Resource',
  GRA: 'Grammar',
};

const DrillIndexPage = ({ drills, completed }: PageProps) => {
  const [activeCriterion, setActiveCriterion] = useState<Drill['criterion'] | 'all'>('all');
  const completedSet = useMemo(() => new Set(completed.map((v) => v.toLowerCase())), [completed]);

  const filteredDrills = useMemo(() => {
    if (activeCriterion === 'all') return drills;
    return drills.filter((d) => d.criterion === activeCriterion);
  }, [activeCriterion, drills]);

  const groupedByCriterion = useMemo(() => {
    return drills.reduce<Record<string, { total: number; done: number }>>((acc, d) => {
      const key = d.criterion;
      acc[key] = acc[key] ?? { total: 0, done: 0 };
      acc[key].total += 1;
      if (completedSet.has(d.slug)) acc[key].done += 1;
      return acc;
    }, {});
  }, [drills, completedSet]);

  return (
    <Container className="py-12">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-foreground md:text-4xl">Writing micro-drills</h1>
          <p className="text-sm text-muted-foreground">
            Target specific weaknesses with five-minute reps. Finish the required drills in your readiness gate to unlock the next redraft.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-4">
          {(['TR', 'CC', 'LR', 'GRA'] as Drill['criterion'][]).map((criterion) => {
            const stat = groupedByCriterion[criterion] ?? { total: 0, done: 0 };
            return (
              <Card key={criterion} className="space-y-2 p-4">
                <h2 className="text-sm font-semibold text-foreground">{criteriaLabels[criterion]}</h2>
                <p className="text-2xl font-semibold text-foreground">
                  {stat.done}/{stat.total}
                </p>
                <p className="text-xs text-muted-foreground">Completed in the last 14 days</p>
              </Card>
            );
          })}
        </div>

        <Tabs value={activeCriterion} onValueChange={(v) => setActiveCriterion(v as Drill['criterion'] | 'all')}>
          <TabsList>
            <TabsTrigger value="all">All drills</TabsTrigger>
            {(['TR', 'CC', 'LR', 'GRA'] as Drill['criterion'][]).map((criterion) => (
              <TabsTrigger key={criterion} value={criterion}>
                {criteriaLabels[criterion]}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={activeCriterion} className="mt-4">
            {filteredDrills.length === 0 ? (
              <EmptyState
                title="No drills found"
                description="All caught up! Pick a different criterion to keep sharpening your skills."
              />
            ) : (
              <div className="grid gap-4">
                {filteredDrills.map((drill) => {
                  const isComplete = completedSet.has(drill.slug);
                  return (
                    <Card key={drill.id} className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="space-y-1">
                          <h3 className="text-lg font-semibold text-foreground">{drill.title}</h3>
                          <p className="text-sm text-muted-foreground">{drill.prompt}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2 text-xs text-muted-foreground">
                          <Badge variant="soft" tone="info" size="sm">
                            {criteriaLabels[drill.criterion]}
                          </Badge>
                          <span>{drill.durationMinutes} min</span>
                          {isComplete && (
                            <Badge variant="soft" tone="success" size="sm">
                              Completed
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {drill.tags.map((tag) => (
                          <Badge key={tag} variant="soft" tone="default" size="sm">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" href={`/writing/drills/${drill.slug}`}>
                          Start drill
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Container>
  );
};

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const supabase = getServerClient(ctx.req as any, ctx.res as any);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      redirect: {
        destination: '/welcome?from=/writing/drills',
        permanent: false,
      },
    };
  }

  // Completed drills in last 14 days
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: events } = await supabase
    .from('writing_drill_events')
    .select('tags, completed_at')
    .eq('user_id', user.id)
    .gte('completed_at', since);

  const completedSlugs = new Set<string>();
  (events ?? []).forEach((e) => {
    (e.tags ?? []).forEach((tag: string) => {
      const t = (tag || '').toLowerCase();
      if (t.startsWith('drill-')) completedSlugs.add(t.replace(/^drill-/, ''));
      else completedSlugs.add(t);
    });
  });

  const drills = allDrills; // NOTE: allDrills is an array in your codebase

  return {
    props: {
      drills,
      completed: Array.from(completedSlugs),
    },
  };
};

export default DrillIndexPage;
