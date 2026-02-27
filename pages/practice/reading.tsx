import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { readingPracticeList } from '@/data/reading';
import { mockSections } from '@/data/mock';

const formatMinutes = (seconds: number) => `${Math.round(seconds / 60)} mins`;

const quickActions = [
  {
    title: 'Mock test hub',
    description: 'Three long passages with review tools that surface the exact evidence.',
    href: '/mock/reading',
  },
  {
    title: 'Passage library',
    description: 'Target question families and micro-drills for Academic & General Training.',
    href: '/reading',
  },
  {
    title: 'Progress insights',
    description: 'Check accuracy by passage and get difficulty-adjusted band predictions.',
    href: '/progress',
  },
];

const readingStrategies = [
  {
    title: 'Highlight & note toolkit',
    description: 'Colour-code supporting sentences and leave reminders while you read.',
  },
  {
    title: 'Keyword tracking',
    description: 'AI surfaces synonyms and paraphrases that triggered each answer.',
  },
  {
    title: 'Adaptive pacing',
    description: 'Timer nudges help you allocate time per passage based on your past results.',
  },
];

const featuredSets = readingPracticeList.slice(0, 4);

export default function ReadingPracticePage() {
  const totalQuestions = mockSections.reading.questions.length;

  return (
    <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
      <Container>
        <div className="max-w-3xl space-y-6">
          <div>
            <h1 className="font-slab text-display mb-3 text-gradient-primary">Reading Practice</h1>
            <p className="text-grayish">
              Move from skimming to evidence-based answers. Combine targeted drills with full papers and analytics designed to push you past band 7.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {quickActions.map((action) => (
              <Card key={action.title} className="card-surface rounded-ds-2xl p-4 flex flex-col">
                <h2 className="text-h5 font-semibold text-foreground">{action.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground flex-1">{action.description}</p>
                <Button href={action.href} variant="ghost" className="mt-4 rounded-ds self-start">
                  Open
                </Button>
              </Card>
            ))}
          </div>
        </div>

        <div className="mt-16">
          <h2 className="text-h3 font-semibold text-foreground">Featured reading papers</h2>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Focus on your biggest blind spots. After each attempt you receive paragraph references, summary notes, and revision flashcards automatically.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {featuredSets.map((paper) => (
              <Card key={paper.id} className="card-surface rounded-ds-2xl p-6 h-full flex flex-col">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-h5 font-semibold text-foreground">{paper.title}</h3>
                    <Badge variant="info" size="sm">{formatMinutes(paper.durationSec)}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{paper.passages} passages · {paper.totalQuestions} questions</p>
                </div>
                <Button href={`/mock/reading/${paper.id}`} variant="primary" className="mt-6 rounded-ds">
                  Start now
                </Button>
              </Card>
            ))}
          </div>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {readingStrategies.map((item) => (
            <Card key={item.title} className="card-surface rounded-ds-2xl p-6 h-full">
              <h3 className="text-h5 font-semibold text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
            </Card>
          ))}
        </div>

        <div className="mt-16">
          <Card className="card-surface rounded-ds-2xl p-6 md:flex md:items-center md:justify-between">
            <div>
              <h2 className="text-h4 font-semibold text-foreground">Master all {totalQuestions} question slots</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Our review engine spots which question families cost you marks and queues personalised drills for the next session.
              </p>
            </div>
            <Button href="/mock/reading" variant="primary" className="mt-4 rounded-ds md:mt-0">
              Browse mock tests
            </Button>
          </Card>
        </div>
      </Container>
    </section>
  );
}
