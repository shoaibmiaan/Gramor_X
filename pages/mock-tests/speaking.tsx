import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { speakingPracticeList } from '@/data/speaking';

const speakingHighlights = [
  {
    title: 'Studio-grade recordings',
    description:
      'Record within the browser, auto-save responses, and export audio to share with tutors or peers for additional feedback.',
  },
  {
    title: 'Instant transcripts & analysis',
    description:
      'AI transcription highlights fillers, pacing, and pronunciation so you can focus practice on what matters.',
  },
  {
    title: 'Follow-up coaching prompts',
    description:
      'Guided reflections after each part help you write better answers for your next attempt.',
  },
];

const speakingFlow = [
  {
    title: 'Part 1 · Interview warm-up',
    description: 'Rapid-fire personal questions with tips to extend answers naturally.',
  },
  {
    title: 'Part 2 · Cue card',
    description: 'Timed prep + speaking timer to mirror the real exam pressure.',
  },
  {
    title: 'Part 3 · Discussion',
    description: 'Higher-level follow-ups with AI-generated sample ideas and vocabulary.',
  },
];

export default function SpeakingMockTestsPage() {
  const primaryScript = speakingPracticeList[0];

  return (
    <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
      <Container>
        <div className="max-w-3xl space-y-6">
          <div>
            <h1 className="font-slab text-display mb-3 text-gradient-primary">Speaking Mock Tests</h1>
            <p className="text-grayish">
              Simulate the face-to-face interview with recording, timing, and feedback flows that mirror the IELTS speaking test.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {speakingPracticeList.map((meta) => (
              <Card key={meta.id} className="card-surface rounded-ds-2xl p-4">
                <p className="text-sm text-muted-foreground">{meta.title}</p>
                <p className="mt-1 text-h4 font-semibold text-foreground">{meta.durationMinutes} mins</p>
                <p className="mt-1 text-xs text-muted-foreground">{meta.totalPrompts} prompts</p>
              </Card>
            ))}
          </div>

          {primaryScript ? (
            <div className="flex flex-wrap items-center gap-4">
              <Button href={`/mock/speaking/${primaryScript.id}`} variant="primary" className="rounded-ds">
                Start {primaryScript.title}
              </Button>
              <Button href="#speaking-scripts" variant="ghost" className="rounded-ds">
                Compare scripts
              </Button>
            </div>
          ) : null}
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {speakingHighlights.map((feature) => (
            <Card key={feature.title} className="card-surface rounded-ds-2xl p-6 h-full">
              <h2 className="text-h5 font-semibold text-foreground">{feature.title}</h2>
              <p className="mt-3 text-sm text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>

        <div id="speaking-scripts" className="mt-16">
          <h2 className="text-h3 font-semibold text-foreground">Select a speaking script</h2>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Each script includes complete timing, prompts, and follow-up questions. Add reflections after every part to accelerate improvement.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {speakingPracticeList.map((script) => (
              <Card key={script.id} className="card-surface rounded-ds-2xl p-6 h-full">
                <div className="flex h-full flex-col gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-h4 font-semibold text-foreground">{script.title}</h2>
                      <Badge variant="info" size="sm">{script.totalPrompts} prompts</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{script.description}</p>
                  </div>

                  <div className="mt-auto">
                    <Button href={`/mock/speaking/${script.id}`} variant="primary" className="rounded-ds w-full">
                      Start speaking mock
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="mt-16">
          <h2 className="text-h3 font-semibold text-foreground">Build interview stamina</h2>
          <p className="mt-2 text-muted-foreground max-w-3xl">
            Practise the full flow or drill a specific part. Our simulator keeps the pressure realistic without needing a human partner every time.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {speakingFlow.map((step) => (
              <Card key={step.title} className="card-surface rounded-ds-2xl p-6 h-full">
                <h3 className="text-h5 font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
