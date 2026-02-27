import { useEffect, useState } from 'react';
import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';

import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Container } from '@/components/design-system/Container';
import { EmptyState } from '@/components/design-system/EmptyState';
import PromptCard from '@/components/speaking/PromptCard';
import { track } from '@/lib/analytics/track';
import { getServerClient } from '@/lib/supabaseServer';
import { coercePlanId, type PlanId } from '@/types/pricing';
import type { PromptRecord } from '@/types/speakingPrompts';

interface PageProps {
  pack: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
  };
  prompts: PromptRecord[];
  plan: PlanId;
  signedIn: boolean;
  bookmarkedIds: string[];
}

export default function SpeakingPackPage({ pack, prompts, plan, signedIn, bookmarkedIds }: PageProps) {
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<Set<string>>(() => new Set(bookmarkedIds));
  const loginHref = router.asPath || `/speaking/packs/${pack.slug}`;

  const handleBookmarkChange = (promptId: string, bookmarked: boolean) => {
    setBookmarks((current) => {
      const next = new Set(current);
      if (bookmarked) next.add(promptId);
      else next.delete(promptId);
      return next;
    });
  };

  useEffect(() => {
    track('prompt_pack_viewed', {
      pack_slug: pack.slug,
      prompt_count: prompts.length,
    });
  }, [pack.slug, prompts.length]);

  return (
    <>
      <Head>
        <title>{pack.title} | Speaking Prompt Pack</title>
      </Head>
      <section className="py-20">
        <Container className="space-y-10">
          <div className="max-w-3xl space-y-4">
            <Badge variant="info">Prompt pack</Badge>
            <h1 className="font-slab text-display leading-tight">{pack.title}</h1>
            {pack.description && <p className="text-body text-grayish">{pack.description}</p>}
            <Button href="/speaking/library" variant="secondary" className="rounded-ds-xl">
              Back to library
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {prompts.map((prompt) => (
              <PromptCard
                key={prompt.id}
                prompt={{ ...prompt, bookmarked: bookmarks.has(prompt.id) }}
                signedIn={signedIn}
                plan={plan}
                loginHref={loginHref}
                onBookmarkChange={handleBookmarkChange}
              />
            ))}
          </div>

          {prompts.length === 0 && (
            <EmptyState
              title="No prompts in this pack yet"
              description="We are preparing new drills for this collection. Check back soon."
            />
          )}
        </Container>
      </section>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const { slug } = ctx.query;
  if (typeof slug !== 'string') {
    return { notFound: true };
  }

  const supabase = getServerClient(ctx.req as any, ctx.res as any);
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;

  const { data: pack, error } = await supabase
    .from('speaking_prompt_packs')
    .select('id, slug, title, description, is_active')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !pack || !pack.is_active) {
    return { notFound: true };
  }

  let plan: PlanId = 'free';
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('membership')
      .eq('user_id', user.id)
      .maybeSingle();
    plan = coercePlanId(profile?.membership ?? undefined);
  }

  const packItems = await supabase
    .from('speaking_prompt_pack_items')
    .select(
      'sort_order, prompt:prompt_id (id, slug, part, topic, question, cue_card, followups, difficulty, locale, tags, is_active, created_at)',
    )
    .eq('pack_id', pack.id)
    .order('sort_order', { ascending: true });

  if (packItems.error) {
    return { notFound: true };
  }

  const prompts: PromptRecord[] = (packItems.data ?? [])
    .map((item) => item.prompt)
    .filter((prompt): prompt is NonNullable<typeof prompt> => Boolean(prompt))
    .map((prompt) => ({
      id: prompt.id,
      slug: prompt.slug,
      part: prompt.part,
      topic: prompt.topic,
      question: prompt.question ?? null,
      cueCard: prompt.cue_card ?? null,
      followups: Array.isArray(prompt.followups) ? prompt.followups : [],
      difficulty: prompt.difficulty,
      locale: prompt.locale,
      tags: Array.isArray(prompt.tags) ? prompt.tags : [],
      isActive: prompt.is_active,
      createdAt: prompt.created_at,
      bookmarked: false,
    }));

  let bookmarkedIds: string[] = [];
  if (user && prompts.length > 0) {
    const { data: saves } = await supabase
      .from('speaking_prompt_saves')
      .select('prompt_id')
      .eq('user_id', user.id)
      .eq('is_bookmarked', true)
      .in('prompt_id', prompts.map((prompt) => prompt.id));
    bookmarkedIds = (saves ?? []).map((row) => row.prompt_id);
  }

  return {
    props: {
      pack: {
        id: pack.id,
        slug: pack.slug,
        title: pack.title,
        description: pack.description ?? null,
      },
      prompts,
      plan,
      signedIn: Boolean(user),
      bookmarkedIds,
    },
  };
};
