import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import Icon from '@/components/design-system/Icon';
import Link from 'next/link';

import type { ActionItem, InnovationTile, TileAction } from './types';

type PriorityActionsSectionProps = {
  actionItems: ActionItem[];
};

const accentClass: Record<NonNullable<InnovationTile['accent']>, string> = {
  primary: 'bg-primary/15 text-primary',
  secondary: 'bg-secondary/15 text-secondary',
  success: 'bg-success/15 text-success',
  info: 'bg-electricBlue/15 text-electricBlue',
};

function renderTileAction(key: string, action: TileAction, variant: 'primary' | 'ghost') {
  return 'href' in action ? (
    <Button key={key} size="sm" variant={variant} className="rounded-ds-xl" asChild>
      <Link href={action.href}>{action.label}</Link>
    </Button>
  ) : (
    <Button
      key={key}
      size="sm"
      variant={variant}
      className="rounded-ds-xl"
      onClick={action.action}
    >
      {action.label}
    </Button>
  );
}

export function PriorityActionsSection({ actionItems }: PriorityActionsSectionProps) {
  return (
    <section className="mt-10 space-y-4" id="goal-summary">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-slab text-h2">Today&apos;s priorities</h2>
          <p className="text-grayish">Move the needle with the highest leverage actions first.</p>
        </div>
        <Badge variant="neutral" size="sm">
          Action-first view
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {actionItems.map((item) => (
          <Card
            key={item.id}
            className="flex h-full flex-col justify-between gap-5 rounded-ds-2xl border border-border/60 bg-card/60 p-6"
          >
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${accentClass[item.accent]}`}
                >
                  <Icon name={item.icon} size={20} />
                </span>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-lg text-foreground">{item.title}</h3>
                    {item.done ? (
                      <Badge variant="success" size="xs">
                        Done
                      </Badge>
                    ) : null}
                    {item.chip ? (
                      <Badge variant="neutral" size="xs">
                        {item.chip}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">{item.caption}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {renderTileAction(`${item.id}-primary`, item.primary, 'primary')}
              {item.secondary
                ? renderTileAction(`${item.id}-secondary`, item.secondary, 'ghost')
                : null}
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
