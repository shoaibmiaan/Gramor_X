// pages/mock-tests/index.tsx
import Head from 'next/head';
import Link from 'next/link';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { track } from '@/lib/analytics/track';
import { mockTests } from '@/data/mock-tests';

export default function MockTestsIndex() {
  const handleClick = (slug: string, skill: string) => {
    track('mock_test_open', { slug, skill });
  };

  return (
    <>
      <Head>
        <title>Mock Tests • IELTS (Full + Modules)</title>
        <meta
          name="description"
          content="Full-length IELTS mocks and module-wise practice with AI scoring, analytics, and review."
        />
      </Head>

      <section
        className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90"
        aria-labelledby="mock-tests-heading"
      >
        <Container>
          <header className="mb-6">
            <h1 id="mock-tests-heading" className="font-slab text-display mb-3 text-gradient-primary">
              Mock Tests
            </h1>
            <p className="text-grayish max-w-2xl">
              Full-length exams and section-wise practice with AI scoring, analytics, and review.
            </p>
          </header>

          {mockTests.length === 0 ? (
            <Card className="card-surface p-8 rounded-ds-2xl">
              <div className="flex flex-col gap-3">
                <h2 className="text-h4 font-semibold">Nothing here yet</h2>
                <p className="text-body opacity-90">
                  We’re assembling the best mocks for you. In the meantime, explore practice by skill.
                </p>
                <div className="mt-2 flex gap-3">
                  <Button variant="primary" className="rounded-ds" asChild>
                    <Link href="/practice">Go to Practice Hub</Link>
                  </Button>
                  <Button variant="secondary" className="rounded-ds" asChild>
                    <Link href="/study-plan">Set Study Plan</Link>
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <ul role="list" className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-label="Available mock tests">
              {mockTests.map((m) => {
                const headingId = `mock-${m.slug}`;
                return (
                  <li key={m.slug} role="listitem">
                    <Card as="article" className="card-surface p-6 rounded-ds-2xl" aria-labelledby={headingId}>
                      <div className="flex items-start justify-between gap-3">
                        <h3 id={headingId} className="text-h3 font-semibold">
                          {m.title}
                        </h3>
                        <Badge variant={m.skill === 'Full' ? 'success' : 'info'} size="sm" aria-label={`Skill: ${m.skill}`}>
                          {m.skill}
                        </Badge>
                      </div>

                      <p className="mt-2 text-body opacity-90">{m.description}</p>

                      <div className="mt-6">
                        <Button
                          variant="primary"
                          className="rounded-ds"
                          asChild
                          data-testid={`open-${m.slug}`}
                          onClick={() => handleClick(m.slug, m.skill)}
                        >
                          <Link href={m.href}>
                            <span className="sr-only">Open {m.title} — </span>
                            {m.skill === 'Full' ? 'Start full mock' : 'Open practice'}
                          </Link>
                        </Button>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </Container>
      </section>
    </>
  );
}
