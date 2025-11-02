// pages/mock-tests/index.tsx
import Head from 'next/head';
import Link from 'next/link';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Clock, Volume2, BookOpen, Edit3, Mic2 } from 'lucide-react';
import { track } from '@/lib/analytics/track';

// Sample data expanded with multiple tests per module
const mockTests = [
  // Full Module
  {
    slug: 'full-ielts-mock-1',
    title: 'Full IELTS Mock Test 1',
    skill: 'Full',
    description: 'Complete 3-hour exam simulation covering all modules with timed sections.',
    href: '/mock-tests/full-ielts-mock-1',
    completed: 0,
  },
  {
    slug: 'full-ielts-mock-2',
    title: 'Full IELTS Mock Test 2',
    skill: 'Full',
    description: 'Advanced full-length practice with varied question types and real exam conditions.',
    href: '/mock-tests/full-ielts-mock-2',
    completed: 3,
  },
  {
    slug: 'full-ielts-mock-3',
    title: 'Full IELTS Mock Test 3',
    skill: 'Full',
    description: 'High-difficulty full mock focusing on time management and band 8+ strategies.',
    href: '/mock-tests/full-ielts-mock-3',
    completed: 1,
  },
  {
    slug: 'full-ielts-mock-4',
    title: 'Full IELTS Mock Test 4',
    skill: 'Full',
    description: 'General training variant with workplace scenarios and everyday topics.',
    href: '/mock-tests/full-ielts-mock-4',
    completed: 2,
  },
  // Listening Module
  {
    slug: 'listening-mock-1',
    title: 'Listening Module Mock 1',
    skill: 'Listening',
    description: '30-minute audio-based test with 40 questions on conversations and monologues.',
    href: '/mock-tests/listening-mock-1',
    completed: 2,
  },
  {
    slug: 'listening-mock-2',
    title: 'Listening Module Mock 2',
    skill: 'Listening',
    description: 'Practice with accents and speeds similar to the actual IELTS Listening test.',
    href: '/mock-tests/listening-mock-2',
    completed: 0,
  },
  {
    slug: 'listening-mock-3',
    title: 'Listening Module Mock 3',
    skill: 'Listening',
    description: 'Focus on note-taking and multiple-choice questions with academic lectures.',
    href: '/mock-tests/listening-mock-3',
    completed: 4,
  },
  {
    slug: 'listening-mock-4',
    title: 'Listening Module Mock 4',
    skill: 'Listening',
    description: 'Daily life scenarios with map/diagram labeling and form completion.',
    href: '/mock-tests/listening-mock-4',
    completed: 1,
  },
  {
    slug: 'listening-mock-5',
    title: 'Listening Module Mock 5',
    skill: 'Listening',
    description: 'Advanced audio challenges including short talks and extended discussions.',
    href: '/mock-tests/listening-mock-5',
    completed: 3,
  },
  // Reading Module
  {
    slug: 'reading-mock-1',
    title: 'Reading Module Mock 1',
    skill: 'Reading',
    description: '60-minute test with academic or general passages and multiple question formats.',
    href: '/mock-tests/reading-mock-1',
    completed: 1,
  },
  {
    slug: 'reading-mock-2',
    title: 'Reading Module Mock 2',
    skill: 'Reading',
    description: 'Focus on skimming, scanning, and detailed comprehension skills.',
    href: '/mock-tests/reading-mock-2',
    completed: 4,
  },
  {
    slug: 'reading-mock-3',
    title: 'Reading Module Mock 3',
    skill: 'Reading',
    description: 'True/False/Not Given questions with scientific and historical texts.',
    href: '/mock-tests/reading-mock-3',
    completed: 0,
  },
  {
    slug: 'reading-mock-4',
    title: 'Reading Module Mock 4',
    skill: 'Reading',
    description: 'Summary completion and matching headings for band improvement.',
    href: '/mock-tests/reading-mock-4',
    completed: 2,
  },
  {
    slug: 'reading-mock-5',
    title: 'Reading Module Mock 5',
    skill: 'Reading',
    description: 'General training reading with ads, notices, and longer articles.',
    href: '/mock-tests/reading-mock-5',
    completed: 5,
  },
  // Writing Module
  {
    slug: 'writing-mock-1',
    title: 'Writing Module Mock 1',
    skill: 'Writing',
    description: 'Task 1 (150 words) and Task 2 (250 words) with 60-minute limit and sample prompts.',
    href: '/mock-tests/writing-mock-1',
    completed: 0,
  },
  {
    slug: 'writing-mock-2',
    title: 'Writing Module Mock 2',
    skill: 'Writing',
    description: 'Graph/letter and essay tasks with AI feedback on coherence and vocabulary.',
    href: '/mock-tests/writing-mock-2',
    completed: 2,
  },
  {
    slug: 'writing-mock-3',
    title: 'Writing Module Mock 3',
    skill: 'Writing',
    description: 'Opinion essays and process descriptions for academic focus.',
    href: '/mock-tests/writing-mock-3',
    completed: 1,
  },
  {
    slug: 'writing-mock-4',
    title: 'Writing Module Mock 4',
    skill: 'Writing',
    description: 'Discussion tasks and bar chart analysis with timed submission.',
    href: '/mock-tests/writing-mock-4',
    completed: 3,
  },
  {
    slug: 'writing-mock-5',
    title: 'Writing Module Mock 5',
    skill: 'Writing',
    description: 'Advantages/disadvantages essays and report writing practice.',
    href: '/mock-tests/writing-mock-5',
    completed: 0,
  },
  // Speaking Module
  {
    slug: 'speaking-mock-1',
    title: 'Speaking Module Mock 1',
    skill: 'Speaking',
    description: '11-14 minute simulated interview with Part 1, 2, and 3 questions.',
    href: '/mock-tests/speaking-mock-1',
    completed: 1,
  },
  {
    slug: 'speaking-mock-2',
    title: 'Speaking Module Mock 2',
    skill: 'Speaking',
    description: 'Practice fluency, pronunciation, and topic development with recording options.',
    href: '/mock-tests/speaking-mock-2',
    completed: 0,
  },
  {
    slug: 'speaking-mock-3',
    title: 'Speaking Module Mock 3',
    skill: 'Speaking',
    description: 'Cue card long turn practice on familiar topics like travel and education.',
    href: '/mock-tests/speaking-mock-3',
    completed: 4,
  },
  {
    slug: 'speaking-mock-4',
    title: 'Speaking Module Mock 4',
    skill: 'Speaking',
    description: 'Part 3 discussion on abstract ideas with follow-up questions.',
    href: '/mock-tests/speaking-mock-4',
    completed: 2,
  },
  {
    slug: 'speaking-mock-5',
    title: 'Speaking Module Mock 5',
    skill: 'Speaking',
    description: 'Full mock interview with AI evaluation on lexical resource and grammar.',
    href: '/mock-tests/speaking-mock-5',
    completed: 3,
  },
];

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

  // Group tests by module/skill
  const groupedTests = mockTests.reduce((acc, test) => {
    if (!acc[test.skill]) {
      acc[test.skill] = [];
    }
    acc[test.skill].push(test);
    return acc;
  }, {} as Record<string, typeof mockTests>);

  // Order of modules: Full first, then alphabetical
  const moduleOrder = ['Full', 'Listening', 'Reading', 'Writing', 'Speaking'];

  return (
    <>
      <Head>
        <title>Mock Tests • IELTS (All Modules)</title>
        <meta
          name="description"
          content="Full-length IELTS mocks and module-specific practice for Listening, Reading, Writing, Speaking with AI scoring and analytics."
        />
      </Head>

      <section
        className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90"
        aria-labelledby="mock-tests-heading"
      >
        <Container>
          <header className="mb-6">
            <h1 id="mock-tests-heading" className="font-slab text-display mb-3 text-gradient-primary">
              IELTS Mock Tests
            </h1>
            <p className="text-grayish max-w-2xl">
              Practice all modules: Listening, Reading, Writing, Speaking, and full exams with AI-powered scoring, detailed analytics, and personalized review.
            </p>
          </header>

          {Object.keys(groupedTests).length === 0 ? (
            <Card className="card-surface p-8 rounded-ds-2xl">
              <div className="flex justify-center mb-6">
                <svg className="w-24 h-24 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex flex-col gap-3">
                <h2 className="text-h4 font-semibold">Nothing here yet</h2>
                <p className="text-body opacity-90">
                  We’re preparing top-quality mocks for all IELTS modules. Start with targeted practice in the meantime.
                </p>
                <div className="mt-2 flex gap-3">
                  <Button variant="primary" className="rounded-ds" asChild>
                    <Link href="/practice">Practice by Module</Link>
                  </Button>
                  <Button variant="secondary" className="rounded-ds" asChild>
                    <Link href="/study-plan">Create Study Plan</Link>
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <div className="space-y-12" aria-label="Mock tests grouped by IELTS module">
              {moduleOrder.map((module) => (
                groupedTests[module] && groupedTests[module].length > 0 ? (
                  <section key={module} aria-labelledby={`module-${module.toLowerCase()}-heading`}>
                    <h2 id={`module-${module.toLowerCase()}-heading`} className="flex items-center gap-3 mb-6 text-h2 font-semibold text-gray-900 dark:text-white">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary w-10 h-10 flex items-center justify-center">
                        {getSkillIcon(module)}
                      </div>
                      {module} Tests
                      <span className="text-body ml-auto text-gray-500">({groupedTests[module].length} available)</span>
                    </h2>
                    <ul
                      role="list"
                      className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                      style={{ gridTemplateRows: 'masonry' }}
                      aria-label={`Available mock tests for ${module} module`}
                    >
                      {groupedTests[module].map((m) => {
                        const headingId = `mock-${m.slug}`;
                        const completed = m.completed || 0;
                        const totalSections = 5; // Adjust based on module if needed
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
                                <Badge variant={m.skill === 'Full' ? 'success' : 'info'} size="sm" aria-label={`Module: ${m.skill}`}>
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
                                    <span className="sr-only">Start {m.title}, {m.skill} module mock test — </span>
                                    {m.skill === 'Full' ? 'Start Full Mock' : `Start ${m.skill} Practice`}
                                  </Link>
                                </Button>
                              </div>
                            </Card>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ) : null
              ))}
            </div>
          )}
        </Container>
      </section>
    </>
  );
}