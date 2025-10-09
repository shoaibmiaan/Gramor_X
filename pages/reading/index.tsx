// pages/reading/index.tsx
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Alert } from '@/components/design-system/Alert';
import { ReadingFilterBar } from '@/components/reading/ReadingFilterBar';

type Kind = 'tfng' | 'mcq' | 'matching' | 'short';
type ReadingListItem = {
  slug: string;
  title: string;
  summary?: string | null;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  qCount: number;
  estMinutes: number;
  types: Kind[];
};

export default function ReadingListPage() {
  const [items, setItems] = useState<ReadingListItem[] | null>(null);
  const [error, setError] = useState<string | undefined>();
  const router = useRouter();
  const activeType = (router.query.type as string) || 'all';

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const resp = await fetch('/api/reading/tests');
        if (!resp.ok) throw new Error(`Failed to load catalog (${resp.status})`);
        const json = await resp.json();
        if (!cancelled) {
          const mapped: ReadingListItem[] = (json?.items ?? []).map((item: any) => ({
            slug: String(item.slug),
            title: String(item.title ?? 'Reading Passage'),
            summary: item.summary ?? null,
            difficulty: (item.difficulty ?? 'Medium') as ReadingListItem['difficulty'],
            qCount: Number(item.qCount ?? 0),
            estMinutes: Number(item.estMinutes ?? 20),
            types: ['tfng', 'mcq', 'matching', 'short'],
          }));
          setItems(mapped);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!items) return [] as ReadingListItem[];
    if (activeType === 'all') return items;
    return items.filter((i) => i.types.includes(activeType as Kind));
  }, [items, activeType]);

  return (
    <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
      <Container>
        <h1 className="font-slab text-display text-gradient-primary">Reading Practice</h1>
        <p className="text-grayish max-w-2xl">
          Choose a passage and start a timed practice. Your answers autosave locally.
        </p>

        <ReadingFilterBar className="mt-6" />

        {error && (
          <div className="mt-6">
            <Alert variant="warning" title="Couldn’t load tests">
              {error}
            </Alert>
          </div>
        )}

        {!items ? (
          <div className="mt-10">
            <Card className="p-6">
              <div className="animate-pulse h-6 w-40 bg-muted dark:bg-white/10 rounded" />
            </Card>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((t) => (
              <Card key={t.slug} className="p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-h3 font-semibold mb-1">{t.title}</h3>
                  {t.summary && <p className="text-small text-muted-foreground mb-2">{t.summary}</p>}
                  <div className="flex items-center gap-2 text-small text-grayish">
                    <Badge
                      variant={
                        t.difficulty === 'Hard'
                          ? 'danger'
                          : t.difficulty === 'Medium'
                          ? 'warning'
                          : 'success'
                      }
                      size="sm"
                    >
                      {t.difficulty}
                    </Badge>
                    <span>{t.qCount} Questions</span>
                    <span>•</span>
                    <span>{t.estMinutes} min</span>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <Link href={`/reading/${t.slug}`} className="inline-block">
                    <Button variant="primary" className="rounded-ds-xl">
                      Start
                    </Button>
                  </Link>
                  <Link href={`/reading/${t.slug}#preview`} className="inline-block">
                    <Button variant="secondary" className="rounded-ds-xl">
                      Preview
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>

          {items && filtered.length === 0 && !error && (
            <Card className="mt-8 p-6">
              <h3 className="text-h4 font-semibold mb-1">No passages match this filter yet</h3>
              <p className="text-body text-muted-foreground">
                Try a different question type or check back soon as we add more full-length IELTS readings.
              </p>
            </Card>
          )}
        )}
      </Container>
    </section>
  );
}
