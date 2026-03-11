import Head from 'next/head';
import Link from 'next/link';

import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Container } from '@/components/design-system/Container';

type IncompleteRoutePlaceholderProps = {
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  canonicalUrl?: string;
};

export function IncompleteRoutePlaceholder({
  title,
  description,
  ctaLabel,
  ctaHref,
  secondaryCtaLabel,
  secondaryCtaHref,
  canonicalUrl,
}: IncompleteRoutePlaceholderProps) {
  return (
    <>
      <Head>
        {canonicalUrl ? <link rel="canonical" href={canonicalUrl} /> : null}
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <Container>
          <Card className="max-w-2xl mx-auto space-y-5 p-6 rounded-ds-2xl text-center">
            <h1 className="font-slab text-h2">{title}</h1>
            <p className="text-body text-mutedText">{description}</p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button asChild size="lg">
                <Link href={ctaHref}>{ctaLabel}</Link>
              </Button>
              {secondaryCtaLabel && secondaryCtaHref ? (
                <Button asChild variant="outline" size="lg">
                  <Link href={secondaryCtaHref}>{secondaryCtaLabel}</Link>
                </Button>
              ) : null}
            </div>
          </Card>
        </Container>
      </section>
    </>
  );
}
