// pages/mock-tests/index.tsx
import Head from 'next/head';
import Link from 'next/link';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Clock, Volume2, BookOpen, Edit3, Mic2 } from 'lucide-react';
import { track } from '@/lib/analytics/track';
import { mockTests } from '@/data/mock-tests';

export default function MockTestsIndex() {
  const handleClick = (slug: string, skill: string) => {
    track('mock_test_open', { slug, skill });
  };

  // Helper to get icon for skill
  const getSkillIcon = (skill: string) => {
    switch (skill) {
      case 'Listening': return <Volume2 className="w-5 h-5" />;
      case 'Reading': return <BookOpen className="w-5 h-5" />;
      case 'Writing': return <Edit3 className="w-5 h-5" />;
      case 'Speaking': return <Mic2 className="w-5 h-5" />;
      case 'Full':
      default: return <Clock className="w-5 h-5" />;
    }
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
              <div className="flex justify-center mb-6">
                <svg className="w-24 h-24 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
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
            <ul
              role="list"
              className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
              style={{ gridTemplateRows: 'masonry' }}
              aria-label="Available mock tests"
            >
              {mockTests.map((m) => {
                const headingId = `mock-${m.slug}`;
                // Assume m.completed is a number (0-5); adjust based on your data
                const completed = m.completed || 0;
                const totalSections = 5; // Example total
                return (
                  <li key={m.slug} role="listitem">
                    <Card
                      as="article"
                      className="card-surface p-6 rounded-ds-2xl transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:bg-white/50 dark:hover:bg-dark/80"
                      aria-labelledby={headingId}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary w-10 h-10 flex items-center justify-center flex-shrink-0">
                            {getSkillIcon(m.skill)}
                          </div>
                          <h3 id={headingId} className="text-h3 font-semibold">
                            {m.title}
                          </h3>
                        </div>
                        <Badge variant={m.skill === 'Full' ? 'success' : 'info'} size="sm" aria-label={`Skill: ${m.skill}`}>
                          {m.skill}
                        </Badge>
                      </div>

                      <p className="mt-2 text-body opacity-90">{m.description}</p>

                      {completed > 0 && (
                        <Badge variant="success" size="sm" className="mt-2 block">
                          {completed}/{totalSections} Completed
                        </Badge>
                      )}

                      <div className="mt-6">
                        <Button
                          variant="primary"
                          className="rounded-ds focus-visible:ring-2 focus-visible:ring-primary/50"
                          asChild
                          data-testid={`open-${m.slug}`}
                          onClick={() => handleClick(m.slug, m.skill)}
                        >
                          <Link href={m.href}>
                            <span className="sr-only">Open {m.title}, {m.skill} mock test for IELTS practice — </span>
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