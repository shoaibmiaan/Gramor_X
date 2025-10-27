import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { speakingPracticeList } from '@/data/speaking';

const quickActions = [
  {
    title: 'Mock interview',
    description: 'Record timed responses with automatic saving and checkpoint review.',
    href: '/mock-tests/speaking',
  },
  {
    title: 'Speaking toolkit',
    description: 'Access cue cards, follow-up questions, and pronunciation drills.',
    href: '/speaking',
  },
  {
    title: 'Performance analytics',
    description: 'Track fluency, lexical resource, and pronunciation trends after each attempt.',
    href: '/progress',
  },
];

const speakingSystems = [
  {
    title: 'Pronunciation coach',
    description: 'Instant transcripts highlight stress, rhythm, and filler words to eliminate.',
  },
  {
    title: 'Vocabulary booster',
    description: 'Smart suggestions add collocations and idioms based on your topic.',
  },
  {
    title: 'Reflection journal',
    description: 'Guided prompts help you plan stronger answers for the next session.',
  },
];

export default function SpeakingPracticePage() {
  const featuredScripts = speakingPracticeList;

  return (
    <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
      <Container>
        <div className="max-w-3xl space-y-6">
          <div>
            <h1 className="font-slab text-display mb-3 text-gradient-primary">Speaking Practice</h1>
            <p className="text-grayish">
              Rehearse authentic interviews with AI support. Capture audio, receive instant transcripts, and focus on the skills examiners score.
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
          <h2 className="text-h3 font-semibold text-foreground">Featured speaking scripts</h2>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Choose a script that fits your prep schedule. Each includes Part 1 warmers, a timed cue card, and Part 3 discussions with AI feedback.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {featuredScripts.map((script) => (
              <Card key={script.id} className="card-surface rounded-ds-2xl p-6 h-full flex flex-col">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-h5 font-semibold text-foreground">{script.title}</h3>
                    <Badge variant="info" size="sm">{script.durationMinutes} mins</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{script.description}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{script.totalPrompts} prompts</p>
                </div>
                <Button href={`/mock/speaking/${script.id}`} variant="primary" className="mt-6 rounded-ds">
                  Start now
                </Button>
              </Card>
            ))}
          </div>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {speakingSystems.map((item) => (
            <Card key={item.title} className="card-surface rounded-ds-2xl p-6 h-full">
              <h3 className="text-h5 font-semibold text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
            </Card>
          ))}
        </div>

        <div className="mt-16">
          <Card className="card-surface rounded-ds-2xl p-6 md:flex md:items-center md:justify-between">
            <div>
              <h2 className="text-h4 font-semibold text-foreground">Unlock confident delivery</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Practise regularly and export recordings for tutor review. The system highlights growth in fluency, pronunciation, and vocabulary automatically.
              </p>
            </div>
            <Button href="/mock-tests/speaking" variant="primary" className="mt-4 rounded-ds md:mt-0">
              Browse mock tests
            </Button>
          </Card>
        </div>
      </Container>
    </section>
  );
}
