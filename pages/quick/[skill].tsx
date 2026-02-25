import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { env } from '@/lib/env';
import { flags } from '@/lib/flags';

type QuickSkillProps = {
  skill: string;
};

const canonicalBase = env.NEXT_PUBLIC_SITE_URL
  ? `${env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}/quick`
  : undefined;

export const getServerSideProps: GetServerSideProps<QuickSkillProps> = async (ctx) => {
  if (!flags.enabled('quickTen')) {
    return {
      redirect: {
        destination: '/study-plan',
        permanent: false,
      },
    };
  }

  const rawSkill = ctx.params?.skill;
  const skill = typeof rawSkill === 'string' ? rawSkill : 'drill';

  return {
    props: { skill },
  };
};

function formatSkillName(skill: string) {
  return skill
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function QuickSkillPlaceholder({ skill }: QuickSkillProps) {
  const readableSkill = formatSkillName(skill);
  const canonical = canonicalBase ? `${canonicalBase}/${skill}` : undefined;

  return (
    <>
      <Head>
        <title>{`Quick 10 – ${readableSkill}`}</title>
        {canonical ? <link rel="canonical" href={canonical} /> : null}
        <meta name="robots" content="noindex, nofollow" />
        <meta
          name="description"
          content={`Quick 10 drills for ${readableSkill} are rolling out to early testers. Keep following your study plan while we finish the beta.`}
        />
      </Head>

      <section className="bg-lightBg py-24 dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <Container>
          <Card className="mx-auto max-w-3xl space-y-5 rounded-ds-2xl p-6 text-center">
            <h1 className="font-slab text-h2">Quick 10 drills are almost ready</h1>
            <p className="text-body text-mutedText">
              The {readableSkill.toLowerCase()} micro-drill is part of our Quick 10 beta. We&apos;re calibrating content so the
              ten-minute sessions hit the sweet spot between challenge and confidence.
            </p>
            <p className="text-body text-mutedText">
              Keep practising with your personalised plan. We&apos;ll email you when Quick 10 unlocks so you can jump straight
              into these rapid-fire drills.
            </p>

            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/study-plan">Continue studying</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/mock">Take a mock test</Link>
              </Button>
            </div>
          </Card>
        </Container>
      </section>
    </>
  );
}

