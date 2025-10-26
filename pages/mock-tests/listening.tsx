import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { listeningPracticeList } from '@/data/listening';

const formatMinutes = (seconds: number) => {
  const minutes = Math.round(seconds / 60);
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
};

export default function ListeningPracticeIndex() {
  return (
    <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
      <Container>
        <div className="max-w-3xl">
          <h1 className="font-slab text-display mb-3 text-gradient-primary">Listening Practice Sets</h1>
          <p className="text-grayish">
            Choose a timed listening paper to simulate the IELTS experience. Each test includes four parts with auto-marking and transcripts to review afterwards.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {listeningPracticeList.map((paper) => (
            <Card key={paper.id} className="card-surface h-full rounded-ds-2xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-h4 font-semibold text-foreground">{paper.title}</h2>
                  <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
                    <Badge variant="info" size="sm">{formatMinutes(paper.durationSec)}</Badge>
                    <Badge variant="neutral" size="sm">{paper.sections} sections</Badge>
                    <Badge variant="secondary" size="sm">{paper.totalQuestions} questions</Badge>
                  </div>
                </div>
                <Badge variant="primary" size="sm">Practice</Badge>
              </div>

              <div className="mt-6">
                <Button href={`/mock/listening/${paper.id}`} variant="primary" className="w-full rounded-ds">
                  Start practice
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
