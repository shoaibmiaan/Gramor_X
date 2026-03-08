import Link from 'next/link';

import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import Icon from '@/components/design-system/Icon';

import type { InnovationTile, TileAction } from './types';

type AIWorkspaceSectionProps = {
  innovationTiles: InnovationTile[];
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

export function AIWorkspaceSection({ innovationTiles }: AIWorkspaceSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-slab text-h2">AI workspace</h2>
          <p className="text-grayish">
            Keep your adaptive tools in one consistent hub—jump in wherever you need support.
          </p>
        </div>
        <Badge variant="neutral" size="sm">
          Always improving
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {innovationTiles.map((tile) => {
          const iconBg = tile.accent ? accentClass[tile.accent] : accentClass.primary;
          const badgeVariant: 'accent' | 'success' | 'neutral' =
            tile.badge === 'Rocket' ? 'accent' : tile.badge === 'New' ? 'success' : 'neutral';

          return (
            <Card
              key={tile.id}
              className="group flex h-full flex-col justify-between gap-6 rounded-ds-2xl border border-border/60 bg-card/60 p-6 shadow-sm transition hover:-translate-y-1 hover:bg-card/90 hover:shadow-lg"
            >
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}
                  >
                    <Icon name={tile.icon} size={20} />
                  </span>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg text-foreground">{tile.title}</h3>
                      {tile.badge ? (
                        <Badge variant={badgeVariant} size="xs">
                          {tile.badge}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">{tile.description}</p>
                  </div>
                </div>
                {tile.meta ? <p className="text-xs text-muted-foreground">{tile.meta}</p> : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {renderTileAction(`${tile.id}-primary`, tile.primary, 'primary')}
                {tile.secondary
                  ? renderTileAction(`${tile.id}-secondary`, tile.secondary, 'ghost')
                  : null}
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
