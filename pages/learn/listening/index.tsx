// pages/learn/listening/index.tsx
import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import type { PlanId } from '@/types/pricing';

import { Container } from '@/components/design-system/Container';
import { Section } from '@/components/design-system/Section';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';

import { getServerClient } from '@/lib/supabaseServer';
import { resolveUserPlan } from '@/lib/plan/resolveUserPlan';
import { ListeningHero } from '@/components/listening/ListeningHero';
import { ListeningFilterBar, type ListeningFilter } from '@/components/listening/ListeningFilterBar';
import { ResourceCard } from '@/components/listening/cards/ResourceCard';
import { RequirePlanRibbon } from '@/components/RequirePlanRibbon';

import type { ResourcePreview } from '@/types/listening';
import { fetchListeningResourcesServer } from '@/lib/listening/repo';
import { fetchListeningResourcesClient } from '@/lib/listening/client';
import { fromQuery, toQuery } from '@/lib/listening/filterQuery';
import { useDebouncedEffect } from '@/lib/hooks/useDebouncedEffect';

type Props = {
  __userId: string;
  __plan: PlanId;
  __role: string | null;
  __initial: ResourcePreview[];
  __initialFilter: ListeningFilter;
};

const ALL_TOPICS = ['everyday', 'academic', 'maps', 'numbers'] as const;

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const supabase = getServerClient(ctx.req, ctx.res);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      redirect: { destination: '/auth/signin?next=/learn/listening', permanent: false },
      props: {} as any,
    };
  }

  let plan: PlanId = 'free';
  try {
    const r = await resolveUserPlan(supabase, user.id);
    plan = (r?.planId ?? r?.plan ?? 'free') as PlanId;
  } catch { plan = 'free'; }

  let role: string | null = null;
  const prof = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  role = prof.data?.role ?? null;

  // Parse incoming query -> filter
  const f = fromQuery(ctx.query as Record<string, any>);
  const __initial = await fetchListeningResourcesServer(supabase, {
    level: f.level,
    topics: f.topics,
    accent: f.accent,
    limit: 30,
    offset: 0,
  });

  return { props: { __userId: user.id, __plan: plan, __role: role, __initial, __initialFilter: { topics: [], ...f } } };
};

export default function ListeningIndexPage({ __plan, __role, __initial, __initialFilter }: Props) {
  const router = useRouter();
  const [filter, setFilter] = React.useState<ListeningFilter>({ ...__initialFilter });
  const [items, setItems] = React.useState<ResourcePreview[]>(__initial);
  const [loading, setLoading] = React.useState(false);

  // Debounced data refresh when filter changes
  useDebouncedEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchListeningResourcesClient({
          level: filter.level,
          topics: filter.topics,
          accent: filter.accent,
          limit: 30,
          offset: 0,
        });
        if (mounted) setItems(data);
      } catch {
        if (mounted) setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [filter.level, filter.accent, JSON.stringify(filter.topics)], 300);

  // URL sync (shallow) – keeps the page deep-linkable
  useDebouncedEffect(() => {
    const q = toQuery(filter);
    router.replace({ pathname: '/learn/listening', query: q }, undefined, { shallow: true });
  }, [filter.level, filter.accent, JSON.stringify(filter.topics)], 300);

  const isBypass = __role === 'admin' || __role === 'teacher';
  const needsPremium = (__plan === 'free' || __plan === 'starter');
  const showRibbon = !isBypass && needsPremium;

  return (
    <>
      <Head>
        <title>Listening Tips & Resources — GramorX</title>
        <meta name="description" content="IELTS Listening hub: level-based tips, practice, and tools." />
      </Head>

      <main>
        <Section>
          <Container>
            {showRibbon && <RequirePlanRibbon min="booster" userPlan={__plan} role={__role} exitHref="/" className="mb-4" />}
            <ListeningHero />
          </Container>
        </Section>

        <Section>
          <Container>
            <ListeningFilterBar value={filter} allTopics={ALL_TOPICS as unknown as string[]} onChange={setFilter} />
          </Container>
        </Section>

        <Section>
          <Container>
            {loading ? (
              <Card className="p-6"><div className="opacity-80">Loading resources…</div></Card>
            ) : items.length === 0 ? (
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">No resources match your filters</h3>
                    <p className="mt-1 opacity-80">Try clearing a filter or check back soon — more content is on the way.</p>
                  </div>
                  <Link href="/learn/listening/beginner" className="inline-flex">
                    <Button>Start with Beginner Guide</Button>
                  </Link>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {items.map((r) => (
                  <ResourceCard
                    key={r.id}
                    title={r.title}
                    kind={r.kind}
                    level={r.level}
                    accent={r.accent}
                    topics={r.topics}
                    href={r.href}
                  />
                ))}
              </div>
            )}
          </Container>
        </Section>
      </main>
    </>
  );
}
