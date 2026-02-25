// components/sections/ModulesOverview.tsx
import React from 'react';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import Icon, { type IconName } from '@/components/design-system/Icon';

type ModuleCard = {
  id: string;
  icon: IconName;
  title: string;
  label: string;
  description: string;
  bullets: string[];
  tag?: string;
};

const modules: ModuleCard[] = [
  {
    id: 'listening',
    icon: 'Headphones',
    title: 'Listening',
    label: 'Audio-first drills',
    description:
      'Exam-style recordings with question sets that train both speed and accuracy.',
    bullets: [
      'Short & full-length recordings',
      'Question types mirrored from real tests',
      'Future: accent diversity & playlists',
    ],
    tag: 'Core module',
  },
  {
    id: 'reading',
    icon: 'FileText',
    title: 'Reading',
    label: 'Passages & item types',
    description:
      'Skim, scan and solve under time pressure — with explanations that don’t waste time.',
    bullets: [
      'True/False/Not Given, MCQs, matching',
      'Guided review of wrong answers',
      'Future: difficulty ladder per band',
    ],
    tag: 'Core module',
  },
  {
    id: 'writing',
    icon: 'PenSquare',
    title: 'Writing',
    label: 'Task 1 & Task 2',
    description:
      'Structure, coherence, lexical resource and grammar checked with AI and clear tips.',
    bullets: [
      'Band-style rubric breakdown',
      'Before / After comparisons in AI Lab',
      'Future: teacher plug-in for manual review',
    ],
    tag: 'AI-heavy',
  },
  {
    id: 'speaking',
    icon: 'Mic2',
    title: 'Speaking',
    label: 'Record & review',
    description:
      'Prompt packs for Parts 1, 2 and 3 with AI insights on fluency, vocab and pronunciation.',
    bullets: [
      'Record directly in browser',
      'Part-wise scoring hints',
      'Future: conversation-style dialogues',
    ],
    tag: 'AI-heavy',
  },
  {
    id: 'ai-lab',
    icon: 'Sparkles',
    title: 'AI Lab',
    label: 'Your experiment space',
    description:
      'Try answers, tweak phrasing, and compare versions side by side before the real exam.',
    bullets: [
      'Writing + Speaking pipelines',
      '“Compare Before / After” mode',
      'Future: cross-attempt insights',
    ],
    tag: 'Always-on coach',
  },
  {
    id: 'analytics',
    icon: 'PieChart',
    title: 'Analytics & streaks',
    label: 'Progress, not vibes',
    description:
      'Band trajectory, time on task, accuracy by question type and meaningful streaks.',
    bullets: [
      'Band curve across modules',
      'Time spent vs. results',
      'Streaks focused on real study, not taps',
    ],
    tag: 'For serious prep',
  },
];

const ModulesOverview: React.FC = () => {
  return (
    <Container>
      <div className="mb-8 text-center">
        <p
          id="modules-heading"
          className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary"
        >
          IELTS four modules + AI stack
        </p>
        <h2 className="mt-2 font-slab text-2xl md:text-3xl text-foreground">
          All parts of the exam, stitched together instead of four separate apps.
        </h2>
        <p className="mt-2 mx-auto max-w-2xl text-xs md:text-sm text-muted-foreground">
          Learning, practice, mocks, AI feedback and analytics share one profile — your
          goal band, exam date, weak skills and time constraints.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((m) => (
          <Card
            key={m.id}
            interactive
            className="flex h-full flex-col justify-between rounded-ds-2xl border border-border/70 bg-surface/95"
          >
            <div className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon name={m.icon} size={20} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{m.title}</p>
                    <p className="text-xs text-muted-foreground">{m.label}</p>
                  </div>
                </div>
                {m.tag ? (
                  <Badge variant="accent" size="xs">
                    {m.tag}
                  </Badge>
                ) : null}
              </div>

              <p className="text-xs text-muted-foreground">{m.description}</p>

              <ul className="mt-2 space-y-2 text-[11px] text-muted-foreground">
                {m.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <span className="mt-[3px] inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary">
                      <Icon name="Check" size={10} />
                    </span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        ))}
      </div>
    </Container>
  );
};

export default ModulesOverview;
