// pages/mock/reading/techniques.tsx
import * as React from 'react';
import Head from 'next/head';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import Icon from '@/components/design-system/Icon';

import { techniqueLessons, type TechniqueLesson } from '@/data/reading/techniqueLessons';

const categories: { id: TechniqueLesson['category']; label: string }[] = [
  { id: 'skimming', label: 'Skimming' },
  { id: 'scanning', label: 'Scanning' },
  { id: 'paraphrasing', label: 'Paraphrasing' },
  { id: 'keyword', label: 'Keyword focus' },
  { id: 'distraction', label: 'Distraction traps' },
];

const ReadingTechniquesPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = React.useState<TechniqueLesson['category']>('skimming');
  const [activeLessonId, setActiveLessonId] = React.useState<string | null>(null);

  const filtered = techniqueLessons.filter((l) => l.category === activeCategory);
  const activeLesson =
    filtered.find((l) => l.id === activeLessonId) ?? filtered[0] ?? techniqueLessons[0] ?? null;

  React.useEffect(() => {
    if (!activeLessonId && filtered[0]) {
      setActiveLessonId(filtered[0].id);
    }
  }, [activeLessonId, filtered]);

  return (
    <>
      <Head>
        <title>Reading Techniques Trainer · GramorX</title>
      </Head>

      <section className="py-10 bg-background">
        <Container className="max-w-5xl space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <Badge size="xs" variant="outline">
                Technique trainer
              </Badge>
              <h1 className="text-xl font-semibold tracking-tight">
                Fix the way you read, not just your score.
              </h1>
              <p className="text-xs text-muted-foreground">
                Short, repeatable drills to sharpen skimming, scanning, and paraphrase recognition.
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <a href="/mock/reading">
                <Icon name="arrow-left" className="h-4 w-4 mr-1" />
                Back to Reading
              </a>
            </Button>
          </div>

          {/* Category tabs */}
          <div className="flex flex-wrap gap-1">
            {categories.map((c) => (
              <Button
                key={c.id}
                size="xs"
                variant={activeCategory === c.id ? 'default' : 'outline'}
                onClick={() => {
                  setActiveCategory(c.id);
                  setActiveLessonId(null);
                }}
              >
                {c.label}
              </Button>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)]">
            {/* Lesson list */}
            <Card className="p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Drills in this category
              </p>
              <div className="space-y-1 max-h-[60vh] overflow-auto">
                {filtered.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setActiveLessonId(l.id)}
                    className={
                      'w-full text-left text-xs rounded-md border px-2 py-1.5 transition-colors ' +
                      (activeLesson?.id === l.id
                        ? 'border-primary bg-primary/5'
                        : 'border-transparent hover:bg-muted')
                    }
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{l.title}</span>
                      <span className="text-[10px] text-muted-foreground capitalize">
                        {l.level}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      {l.summary}
                    </p>
                  </button>
                ))}
                {!filtered.length && (
                  <p className="text-[11px] text-muted-foreground">
                    No drills for this category yet.
                  </p>
                )}
              </div>
            </Card>

            {/* Lesson details */}
            <Card className="p-4 space-y-3">
              {activeLesson ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                        {activeLesson.category}
                      </p>
                      <h2 className="text-sm font-semibold">{activeLesson.title}</h2>
                    </div>
                    <Badge size="xs" variant="outline">
                      {activeLesson.level}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground">{activeLesson.summary}</p>

                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium">Steps</p>
                    <ol className="list-decimal list-inside space-y-1 text-[11px]">
                      {activeLesson.steps.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ol>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium">Tips</p>
                    <ul className="list-disc list-inside space-y-1 text-[11px]">
                      {activeLesson.tips.map((t, idx) => (
                        <li key={idx}>{t}</li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Pick a drill from the left to see the steps.
                </p>
              )}
            </Card>
          </div>
        </Container>
      </section>
    </>
  );
};

export default ReadingTechniquesPage;
