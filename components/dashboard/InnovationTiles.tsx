import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import Icon, { type IconName } from '@/components/design-system/Icon';

type TileAction =
  | { label: string; href: string; action?: never }
  | { label: string; action: () => void; href?: never };

interface InnovationTile {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  accent?: 'primary' | 'secondary' | 'success' | 'info';
  badge?: string;
  meta?: string;
  primary: TileAction;
  secondary?: TileAction;
}

interface InnovationTilesProps {
  tiles: InnovationTile[];
}

const accentClass: Record<NonNullable<InnovationTile['accent']>, string> = {
  primary: 'bg-primary/15 text-primary',
  secondary: 'bg-secondary/15 text-secondary',
  success: 'bg-success/15 text-success',
  info: 'bg-electricBlue/15 text-electricBlue',
};

export const InnovationTiles: React.FC<InnovationTilesProps> = ({ tiles }) => {
  const renderTileAction = (
    key: string,
    action: TileAction,
    variant: 'primary' | 'ghost'
  ) =>
    'href' in action ? (
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

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {tiles.map((tile) => {
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
              {tile.meta ? (
                <p className="text-xs text-muted-foreground">{tile.meta}</p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {renderTileAction(`${tile.id}-primary`, tile.primary, 'primary')}
              {tile.secondary &&
                renderTileAction(`${tile.id}-secondary`, tile.secondary, 'ghost')}
            </div>
          </Card>
        );
      })}
    </div>
  );
};