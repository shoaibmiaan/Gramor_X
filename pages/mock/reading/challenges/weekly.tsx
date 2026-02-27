// pages/mock/reading/challenges/weekly.tsx
import * as React from 'react';
import type { NextPage, GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import Icon from '@/components/design-system/Icon';

import { getServerClient } from '@/lib/supabaseServer';

type Props = {
  slug: string | null;
  error?: string;
};

const WeeklyReadingChallengePage: NextPage<Props> = ({ slug, error }) => {
  return (
    <>
      <Head>
        <title>Weekly Challenge · Reading · GramorX</title>
      </Head>

      <Container className="py-10 max-w-3xl">
        {error && (
          <Card className="p-6 text-center space-y-4">
            <Icon name="alert-triangle" className="h-8 w-8 text-destructive mx-auto" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button asChild>
              <Link href="/mock/reading">
                <Icon name="arrow-left" className="mr-2 h-4 w-4" />
                Back to Reading
              </Link>
            </Button>
          </Card>
        )}

        {!error && slug && (
          <Card className="p-6 space-y-4">
            <Badge size="xs" variant="outline">Weekly Challenge</Badge>

            <h1 className="text-xl font-semibold">Weekly Boss Challenge</h1>
            <p className="text-sm text-muted-foreground">
              A 20-question curated challenge designed to measure your weekly improvement.
            </p>

            <Button asChild size="sm" className="rounded-ds-xl">
              <Link href={`/mock/reading/${slug}?mode=weekly`}>
                <Icon name="calendar" className="mr-2 h-4 w-4" />
                Start Weekly Challenge
              </Link>
            </Button>
          </Card>
        )}
      </Container>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  try {
    const supabase = getServerClient(ctx.req, ctx.res);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        redirect: {
          destination: '/login?redirect=' + encodeURIComponent(ctx.resolvedUrl),
          permanent: false
        }
      };
    }

    // This expects weekly_challenges table (optional)
    const thisWeek = new Date();
    const weekNumber = Number(
      new Date(thisWeek.getFullYear(), 0, 1)
        .toISOString()
        .slice(0, 4)
    );

    // For now: fallback = pick any active test
    const { data: row } = await supabase
      .from('reading_tests')
      .select('slug')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!row) {
      return {
        props: { slug: null, error: 'No test available for weekly challenge.' }
      };
    }

    return { props: { slug: row.slug } };
  } catch {
    return {
      props: {
        slug: null,
        error: 'Failed to load weekly challenge.'
      }
    };
  }
};

export default WeeklyReadingChallengePage;
