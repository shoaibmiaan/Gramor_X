import path from 'node:path';
import { promises as fs } from 'node:fs';

import type { GetStaticProps } from 'next';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import type { ListeningPaper, ListeningPracticeMeta } from '@/data/listening';
import { buildListeningPracticeMeta } from '@/data/listening';

type ListeningPracticePageProps = {
  papers: ListeningPracticeMeta[];
};

const formatMinutes = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return 'Self-paced';
  const minutes = Math.round(seconds / 60);
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
};

export const getStaticProps: GetStaticProps<ListeningPracticePageProps> = async () => {
  const listeningDir = path.join(process.cwd(), 'data/listening');
  const entries = await fs.readdir(listeningDir);

  const papers: ListeningPracticeMeta[] = [];

  await Promise.all(
    entries
      .filter((fileName) => fileName.endsWith('.json'))
      .map(async (fileName) => {
        try {
          const filePath = path.join(listeningDir, fileName);
          const raw = await fs.readFile(filePath, 'utf8');
          const parsed = JSON.parse(raw) as Partial<ListeningPaper>;
          if (!parsed || typeof parsed !== 'object') return;

          const sectionsRaw = Array.isArray(parsed.sections) ? parsed.sections : [];
          if (sectionsRaw.length === 0) return;

          const sections = sectionsRaw.map((section, index) => {
            const scoped = section as {
              id?: unknown;
              title?: unknown;
              audioUrl?: unknown;
              questions?: unknown;
            };
            const questions = Array.isArray(scoped.questions) ? scoped.questions.filter((question) => question != null) : [];

            return {
              id: typeof scoped.id === 'string' ? scoped.id : `section-${index + 1}`,
              title: typeof scoped.title === 'string' ? scoped.title : `Section ${index + 1}`,
              audioUrl: typeof scoped.audioUrl === 'string' ? scoped.audioUrl : undefined,
              questions: questions as ListeningPaper['sections'][number]['questions'],
            };
          });

          const durationSecCandidate =
            typeof parsed.durationSec === 'number'
              ? parsed.durationSec
              : typeof (parsed as { duration?: number }).duration === 'number'
                ? (parsed as { duration: number }).duration
                : typeof (parsed as { durationMinutes?: number }).durationMinutes === 'number'
                  ? Math.round((parsed as { durationMinutes: number }).durationMinutes * 60)
                  : 0;

          const paper: ListeningPaper = {
            id: typeof parsed.id === 'string' ? parsed.id : path.basename(fileName, '.json'),
            title: typeof parsed.title === 'string' ? parsed.title : path.basename(fileName, '.json'),
            durationSec: durationSecCandidate,
            transcript: typeof parsed.transcript === 'string' ? parsed.transcript : undefined,
            sections,
          };

          papers.push(buildListeningPracticeMeta(paper));
        } catch (error) {
          console.warn(`Failed to parse listening paper ${fileName}:`, error);
        }
      })
  );

  papers.sort((a, b) => a.id.localeCompare(b.id));

  return {
    props: { papers },
  };
};

export default function ListeningPracticeIndex({ papers }: ListeningPracticePageProps) {
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
          {papers.length === 0 ? (
            <Card className="card-surface h-full rounded-ds-2xl p-6 text-sm text-muted-foreground">
              No listening practice sets are available right now. Please check back soon.
            </Card>
          ) : (
            papers.map((paper) => (
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
            ))
          )}
        </div>
      </Container>
    </section>
  );
}
