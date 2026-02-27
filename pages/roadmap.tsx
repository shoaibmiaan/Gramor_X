import Head from 'next/head';
import { Section } from '@/components/design-system/Section';
import { Container } from '@/components/design-system/Container';
import { Card, CardContent, CardHeader } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';

const roadmapPhases: Array<{
  title: string;
  timeframe: string;
  description: string;
  highlights: string[];
}> = [
  {
    title: 'Private beta launch',
    timeframe: 'Live now',
    description:
      'We are onboarding our first group of learners to validate the IELTS Mission Control experience end-to-end.',
    highlights: [
      'Guided onboarding with goal tracking and daily study streaks',
      'Access to full-length IELTS mock tests with auto-saving progress',
      'Early versions of AI-powered speaking and writing feedback',
    ],
  },
  {
    title: 'Learning pathways expansion',
    timeframe: 'Q2 2025',
    description:
      'We are packaging curated lessons, drills, and analytics into structured journeys tailored to each target band score.',
    highlights: [
      'Modular learning paths for Academic and General Training exams',
      'Question-type practice sets with smart review tools',
      'Personalised study plan recommendations based on recent attempts',
    ],
  },
  {
    title: 'Community & coaching tools',
    timeframe: 'Q3 2025',
    description:
      'After the core learning experience is stable, we will introduce collaborative and teacher-led workflows.',
    highlights: [
      'Teacher dashboards with submission review overrides',
      'Peer study groups and discussion prompts moderated by coaches',
      'Live events and progress reports to keep learners accountable',
    ],
  },
  {
    title: 'Adaptive mastery & insights',
    timeframe: 'Q4 2025',
    description:
      'Finally, we will focus on deeper analytics and adaptive practice powered by AI to help learners reach mastery faster.',
    highlights: [
      'Skill-wise band progression dashboards with weekly trends',
      'Adaptive recommendations that react to recent strengths and gaps',
      'Automated proficiency reports for learners and institutions',
    ],
  },
];

export default function RoadmapPage() {
  return (
    <>
      <Head>
        <title>Product Roadmap • GramorX</title>
        <meta
          name="description"
          content="See what is live today and what we are building next for the GramorX IELTS Mission Control platform."
        />
      </Head>

      <Section className="bg-gradient-to-b from-background via-background to-background/90">
        <Container className="max-w-3xl text-center space-y-6">
          <p className="inline-flex items-center rounded-full border border-border px-4 py-1 text-xs uppercase tracking-wider text-muted-foreground">
            Product roadmap
          </p>
          <h1 className="font-slab text-display">What&apos;s next for IELTS Mission Control</h1>
          <p className="text-lg text-muted-foreground">
            We share our high-level plans so learners, teachers, and partners know what to expect as we grow the platform.
            Timelines may shift as we incorporate feedback from the private beta.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button href="/waitlist" size="lg">
              Request early access
            </Button>
            <Button href="mailto:hello@gramorx.com" variant="soft" tone="info" size="lg">
              Talk to the team
            </Button>
          </div>
        </Container>
      </Section>

      <Section Container containerClassName="max-w-5xl">
        <div className="grid gap-6 md:grid-cols-2">
          {roadmapPhases.map((phase) => (
            <Card key={phase.title} className="h-full">
              <CardHeader className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-electricBlue">{phase.timeframe}</p>
                <h2 className="font-slab text-h3">{phase.title}</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{phase.description}</p>
                <ul className="space-y-2 text-sm text-foreground">
                  {phase.highlights.map((highlight) => (
                    <li key={highlight} className="flex items-start gap-2">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-electricBlue" aria-hidden />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-12 rounded-3xl border border-border bg-muted/20 p-6 text-center sm:p-10">
          <h2 className="font-slab text-h3 mb-3">Have feedback or a request?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Your suggestions shape the roadmap. Share ideas, integrations, or improvements you&apos;d love to see and our team will
            get in touch.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button href="https://tally.so/r/mJxevO" variant="soft" tone="info" size="md" elevateOnHover>
              Submit feedback
            </Button>
            <Button href="mailto:hello@gramorx.com?subject=Roadmap%20feedback" variant="link" size="md">
              Email hello@gramorx.com
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}
