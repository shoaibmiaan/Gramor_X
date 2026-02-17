// pages/mock/reading/challenges/accuracy.tsx
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

const AccuracyChallengePage: NextPage<Props> = ({ slug, error }) => {
  return (
    <>
      <Head>
        <title>Accuracy Drill · Reading · GramorX</title>
      </Head>

      <Container className="py-10 max-w-3xl">
        {error && (
          <Card className="p-6 text-center space-y-3">
            <Icon name="alert-triangle" className="h-8 w-8 text-destructive mx-auto" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button asChild>
              <Link href="/mock/reading">
                <Icon name="arrow-left" className="h-4 w-4 mr-2" />
                Back to Reading
              </Link>
            </Button>
          </Card>
        )}

        {!error && slug && (
          <Card className="p-6 space-y-4">
            <Badge size="xs" variant="outline">Accuracy Drill</Badge>

            <h1 className="text-xl font-semibold">90% Accuracy Reading Drill</h1>
            <p className="text-sm text-muted-foreground">
              10 targeted questions. Score 90%+ to clear the drill. Designed to eliminate careless mistakes.
            </p>

            <Button asChild size="sm" className="rounded-ds-xl">
              <Link href={`/mock/reading/${slug}?mode=accuracy`}>
                <Icon name="target" className="mr-2 h-4 w-4" />
                Start Accuracy Drill
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user || authError) {
      return {
        redirect: {
          destination: '/login?redirect=' + encodeURIComponent(ctx.resolvedUrl),
          permanent: false
        }
      };
    }

    const { data: row, error: randomErr } = await supabase
      .from('reading_tests')
      .select('slug')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!row || randomErr) {
      return {
        props: {
          slug: null,
          error: 'No test available for accuracy drill.'
        }
      };
    }

    return {
      props: { slug: row.slug }
    };
  } catch {
    return {
      props: {
        slug: null,
        error: 'Failed to load accuracy drill.'
      }
    };
  }
};

export default AccuracyChallengePage;
