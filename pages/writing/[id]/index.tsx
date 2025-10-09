import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

import { Container } from '@/components/design-system/Container';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Card } from '@/components/design-system/Card';
import { WritingEditor, type WritingPaper } from '@/components/writing/Editor';
import samplePaper from '@/data/writing/sample-001.json';

const fallbackPaper = samplePaper as WritingPaper;

const loadPaper = async (slug: string): Promise<WritingPaper> => {
  try {
    const mod = await import(`@/data/writing/${slug}.json`);
    return mod.default as WritingPaper;
  } catch {
    return fallbackPaper;
  }
};

const useWritingPaper = (id?: string) => {
  const [paper, setPaper] = React.useState<WritingPaper | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadPaper(id)
      .then((data) => {
        if (!cancelled) setPaper(data);
      })
      .catch(() => {
        if (!cancelled) setError('We could not load that prompt. Showing a sample instead.');
        if (!cancelled) setPaper(fallbackPaper);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { paper, loading, error } as const;
};

export default function WritingAttemptPage() {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const { paper, loading, error } = useWritingPaper(id);

  return (
    <>
      <Head>
        <title>{paper ? `${paper.task2.title} – Writing practice` : 'Writing practice'} • GramorX</title>
      </Head>
      <section className="bg-lightBg py-16 dark:bg-dark/80">
        <Container>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-slab text-h2 text-foreground md:text-display">Writing practice</h1>
              <p className="mt-2 max-w-2xl text-body text-muted-foreground">
                Draft Task 1 and Task 2 responses with automatic saving. Refreshing or closing the tab will not lose your work.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="neutral" size="sm">Task 1 visual report</Badge>
              <Badge variant="neutral" size="sm">Task 2 essay</Badge>
            </div>
          </div>

          <Card className="card-surface mt-8 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button variant="secondary" onClick={() => router.push('/writing')}>
                ← All prompts
              </Button>
              {paper ? <Badge variant="info" size="sm">Prompt: {paper.id}</Badge> : null}
            </div>

            <div className="mt-6">
              {loading && <p className="text-body text-muted-foreground">Loading prompt…</p>}
              {error && <p className="text-small text-warning">{error}</p>}
              {paper && !loading ? (
                <div className="mt-6">
                  <WritingEditor paper={paper} />
                </div>
              ) : null}
            </div>
          </Card>
        </Container>
      </section>
    </>
  );
}
