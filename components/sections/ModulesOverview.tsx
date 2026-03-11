// components/sections/ModulesOverview.tsx
import React from 'react';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import Icon from '@/components/design-system/Icon';
import { getDashboardModuleCards } from '@/lib/modules/registry';

const modules = getDashboardModuleCards();

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
