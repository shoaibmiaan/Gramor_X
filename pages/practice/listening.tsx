import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { listeningPracticeList } from '@/data/listening/index';
import { mockSections } from '@/data/mock';

const formatMinutes = (seconds: number) => `${Math.round(seconds / 60)} mins`;

const quickActions = [
  {
    title: 'Full mock tests',
    description: 'Run the official 40-minute flow with auto-marking and review.',
    href: '/mock/listening',
  },
  {
    title: 'Question bank',
    description: 'Access listening lessons, transcripts, and micro-drills by question type.',
    href: '/listening',
  },
  {
    title: 'Progress dashboard',
    description: 'See trendlines for accuracy, pacing, and band estimates across attempts.',
    href: '/progress',
  },
];

const listeningStrategies = [
  {
    title: 'Accent exposure packs',
    description: 'Australian, British, and North American recordings with scripts to boost decoding speed.',
  },
  {
    title: 'Smart note flags',
    description: 'Mark tricky timestamps during playback to revisit instantly in review.',
  },
  {
    title: 'Error tagging',
    description: 'Label spelling, grammar, or misunderstanding issues to focus future drills.',
  },
];

const featuredSets = listeningPracticeList.slice(0, 3);

export default function ListeningPracticePage() {
  const questionCount = mockSections.listening.questions.length;

  return (
    <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
      <Container>
        <div className="max-w-3xl space-y-6">
          <div>
            <h1 className="font-slab text-display mb-3 text-gradient-primary">Listening Practice</h1>
            <p className="text-grayish">
              Build active listening stamina with drills that match the computer-delivered IELTS experience. Mix quick accents drills with full mocks to stay exam ready.
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
          <h2 className="text-h3 font-semibold text-foreground">Featured mock sets</h2>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Stay sharp with full-length papers. Each attempt logs accuracy by section and question type so you can see precisely where to focus.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {featuredSets.map((paper) => (
              <Card key={paper.id} className="card-surface rounded-ds-2xl p-6 h-full flex flex-col">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-h5 font-semibold text-foreground">{paper.title}</h3>
                    <Badge variant="info" size="sm">{formatMinutes(paper.durationSec)}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{paper.sections} sections · {paper.totalQuestions} questions</p>
                </div>
                <Button href={`/mock/listening/${paper.id}`} variant="primary" className="mt-6 rounded-ds">
                  Start now
                </Button>
              </Card>
            ))}
          </div>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {listeningStrategies.map((item) => (
            <Card key={item.title} className="card-surface rounded-ds-2xl p-6 h-full">
              <h3 className="text-h5 font-semibold text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
            </Card>
          ))}
        </div>

        <div className="mt-16">
          <Card className="card-surface rounded-ds-2xl p-6 md:flex md:items-center md:justify-between">
            <div>
              <h2 className="text-h4 font-semibold text-foreground">Complete the full {questionCount}-question challenge</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Attempt a mock today and unlock personalised review cards that drop into your daily study plan automatically.
              </p>
            </div>
            <Button href="/mock/listening" variant="primary" className="mt-4 rounded-ds md:mt-0">
              Browse mock tests
            </Button>
          </Card>
        </div>
      </Container>
    </section>
  );
}
