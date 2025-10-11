'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { FC } from 'react';

import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Alert } from '@/components/design-system/Alert';

import track, { events } from '@/lib/analytics/track';
import type { SavedItem } from '@/types/saved';
import { formatDate } from '@/lib/date';
import { useLocale } from '@/lib/locale';
// If PaywallGate exists in your tree, we use it; otherwise the banner still renders without it.
let PaywallGate: any;
try {
  // default export is typical in our tree
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  PaywallGate = require('@/components/paywall/PaywallGate').default ?? null;
} catch {
  PaywallGate = null as any;
}

export interface SavedListProps {
  items: SavedItem[];
  // Optional: let callers hint the surface for analytics (“saved_list” | “study_plan” | “onboarding”)
  surface?: 'saved_list' | 'study_plan' | 'onboarding';
  // Optional: when true, show a stronger nudge (used in onboarding/study plan)
  emphasizeUpgrade?: boolean;
}

const UpgradeBanner: FC<{ surface: SavedListProps['surface']; emphasize?: boolean }> = ({
  surface = 'saved_list',
  emphasize = false,
}) => {
  const { t } = useLocale();

  const title = emphasize
    ? t('upgrade.banner.strong.title', 'Unlock Mistakes Book, AI feedback & full mocks')
    : t('upgrade.banner.title', 'Go further with Booster & Master plans');

  const subtitle = emphasize
    ? t(
        'upgrade.banner.strong.subtitle',
        'Save unlimited questions, get step-by-step AI explanations, and track your band trajectory.'
      )
    : t(
        'upgrade.banner.subtitle',
        'Save more items, see richer insights, and access premium practice sets.'
      );

  const onView = () => {
    // Fire once on mount render path (lazy: call on first paint via useMemo below)
    track(events.paywall_view, { surface });
  };

  useMemo(onView, []); // on first render only

  const onClick = () => {
    track(events.subscribe_clicked, { surface, cta: 'pricing_banner' });
  };

  const Body = (
    <Card className="card-surface p-5 rounded-ds-2xl border-border">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Badge className="bg-primary/10 text-primary border border-border">
            {t('upgrade.badge', 'Upgrade')}
          </Badge>
          <h3 className="text-h4 font-semibold">{title}</h3>
        </div>
        <p className="text-muted-foreground">{subtitle}</p>
        <div className="mt-2 flex gap-3">
          <Link href="/pricing" prefetch>
            <Button onClick={onClick} className="btn-primary">
              {t('upgrade.cta.viewPlans', 'View plans')}
            </Button>
          </Link>
          <Link href="/checkout?plan=booster" prefetch>
            <Button variant="secondary" onClick={onClick} className="btn-secondary">
              {t('upgrade.cta.startBooster', 'Start Booster')}
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );

  // If PaywallGate exists, wrap the banner so it also renders when a gate condition triggers.
  if (PaywallGate) {
    return (
      <PaywallGate featureKey="saved_items_plus">
        {Body}
      </PaywallGate>
    );
  }
  return Body;
};

const EmptyState: FC<{ surface: SavedListProps['surface'] }> = ({ surface }) => {
  const { t } = useLocale();
  return (
    <div className="space-y-4">
      <Alert variant="neutral" title={t('saved.empty.title', 'No saved items yet')}>
        <p className="text-muted-foreground">
          {t(
            'saved.empty.copy',
            'Use the “Save” button on questions, passages, or feedback to build your personal review list.'
          )}
        </p>
      </Alert>
      <UpgradeBanner surface={surface} />
    </div>
  );
};

const ItemCard: FC<{ item: SavedItem }> = ({ item }) => {
  const { t } = useLocale();
  return (
    <Card className="card-surface rounded-ds-2xl p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {item.module && <Badge>{item.module}</Badge>}
            {item.tag && <Badge variant="outline">{item.tag}</Badge>}
          </div>
          <h4 className="text-h5 mt-1 font-semibold">{item.title}</h4>
          {item.note && <p className="text-muted-foreground mt-1">{item.note}</p>}
          <p className="text-subtle mt-2">
            {t('saved.item.savedOn', 'Saved on')} {formatDate(item.saved_at)}
          </p>
        </div>
        <Link href={item.href} prefetch aria-label={t('saved.item.open', 'Open item')}>
          <Button size="sm" className="btn-ghost">
            {t('saved.item.open', 'Open')}
          </Button>
        </Link>
      </div>
    </Card>
  );
};

const SavedList: FC<SavedListProps> = ({ items, surface = 'saved_list', emphasizeUpgrade }) => {
  const hasItems = items && items.length > 0;

  return (
    <section className="space-y-6">
      {!hasItems ? (
        <EmptyState surface={surface} />
      ) : (
        <>
          {/* Soft nudge above the grid for free users / lower plans */}
          <UpgradeBanner surface={surface} emphasize={Boolean(emphasizeUpgrade)} />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => (
              <ItemCard key={it.id} item={it} />
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default SavedList;
