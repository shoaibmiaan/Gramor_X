import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { readingPracticeList } from '@/data/reading';
import { mockSections } from '@/data/mockTests';

const formatMinutes = (seconds: number) => {
  const minutes = Math.round(seconds / 60);
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
};

const readingHighlights = [
  {
    title: 'Adaptive passage layout',
    description:
      'Choose split-screen or scroll mode, add highlights, and leave sticky notes anywhere in the text for later review.',
  },
  {
    title: 'AI explanations & keywords',
    description:
      'See why each answer is correct with paragraph references, supporting sentences, and vocabulary to learn.',
  },
  {
    title: 'Speed & accuracy analytics',
    description:
      'Question navigator tracks your timing and flags accuracy hotspots to prioritise before your next attempt.',
  },
];

const questionFamilies = [
  {
    title: 'True / False / Not Given',
    description: 'Focus on precise meaning; receive paraphrase spotting tips.',
  },
  {
    title: 'Matching & Headings',
    description: 'Practice grouping ideas quickly using drag-and-drop interactions.',
  },
  {
    title: 'Gap fills & Table notes',
    description: 'Build skimming skills with instant keyword suggestions when reviewing.',
  },
  {
    title: 'Multiple choice sets',
    description: 'Timed single and multiple answer variants with rationales for each distractor.',
  },
];

export default function ReadingMockTestsPage() {
  const primaryPaper = readingPracticeList[0];
  const durationMinutes = Math.round(mockSections.reading.duration / 60);
  const totalQuestions = mockSections.reading.questions.length;

  return (
    <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
      <Container>
        <div className="max-w-3xl space-y-6">
          <div>
            <h1 className="font-slab text-display mb-3 text-gradient-primary">Reading Mock Tests</h1>
            <p className="text-grayish">
              Academic passages with authentic IELTS difficulty. Toggle focus modes, annotate as you go, and get guided reviews that show the exact paragraph evidence you missed.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="card-surface rounded-ds-2xl p-4">
              <p className="text-sm text-muted-foreground">Official timing</p>
              <p className="mt-1 text-h4 font-semibold text-foreground">{durationMinutes} mins</p>
              <p className="mt-1 text-xs text-muted-foreground">Resume saved attempts anytime</p>
            </Card>
            <Card className="card-surface rounded-ds-2xl p-4">
              <p className="text-sm text-muted-foreground">Passage bank</p>
              <p className="mt-1 text-h4 font-semibold text-foreground">{readingPracticeList.length} full sets</p>
              <p className="mt-1 text-xs text-muted-foreground">Academic & General topics</p>
            </Card>
            <Card className="card-surface rounded-ds-2xl p-4">
              <p className="text-sm text-muted-foreground">Questions per test</p>
              <p className="mt-1 text-h4 font-semibold text-foreground">{totalQuestions}</p>
              <p className="mt-1 text-xs text-muted-foreground">Balanced difficulty curve</p>
            </Card>
          </div>

          {primaryPaper ? (
            <div className="flex flex-wrap items-center gap-4">
              <Button
                href={`/mock/reading/${primaryPaper.id}`}
                variant="primary"
                className="rounded-ds"
              >
                Start {primaryPaper.title}
              </Button>
              <Button href="#reading-sets" variant="ghost" className="rounded-ds">
                Browse all sets
              </Button>
            </div>
          ) : null}
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {readingHighlights.map((feature) => (
            <Card key={feature.title} className="card-surface rounded-ds-2xl p-6 h-full">
              <h2 className="text-h5 font-semibold text-foreground">{feature.title}</h2>
              <p className="mt-3 text-sm text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>

        <div id="reading-sets" className="mt-16">
          <h2 className="text-h3 font-semibold text-foreground">Choose a reading paper</h2>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Each paper includes three long passages with the full range of IELTS question families. AI review shows you the exact lines that triggered the answer.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {readingPracticeList.map((paper) => (
              <Card key={paper.id} className="card-surface h-full rounded-ds-2xl p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-h4 font-semibold text-foreground">{paper.title}</h2>
                    <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
                      <Badge variant="info" size="sm">{formatMinutes(paper.durationSec)}</Badge>
                      <Badge variant="neutral" size="sm">{paper.passages} passages</Badge>
                      <Badge variant="secondary" size="sm">{paper.totalQuestions} questions</Badge>
                    </div>
                  </div>
                  <Badge variant="primary" size="sm">Practice</Badge>
                </div>

                <div className="mt-6">
                  <Button href={`/mock/reading/${paper.id}`} variant="primary" className="w-full rounded-ds">
                    Start practice
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="mt-16">
          <h2 className="text-h3 font-semibold text-foreground">Master every question family</h2>
          <p className="mt-2 text-muted-foreground max-w-3xl">
            Drill the formats you find toughest. Mock mode surfaces micro-lessons and curated tips as soon as you submit your attempt.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {questionFamilies.map((item) => (
              <Card key={item.title} className="card-surface rounded-ds-2xl p-6 h-full">
                <h3 className="text-h5 font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
