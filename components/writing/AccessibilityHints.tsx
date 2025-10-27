import React, { useId, useMemo } from 'react';
import clsx from 'clsx';

import { useLocale } from '@/lib/locale';

const HINT_KEYS = ['headings', 'bandBreakdown', 'textAlternatives'] as const;
type HintKey = (typeof HINT_KEYS)[number];

type Hint = {
  key: HintKey;
  title: string;
  body: string;
};

export const AccessibilityHints: React.FC = () => {
  const { t, isRTL } = useLocale();
  const headingId = useId();
  const descriptionId = useId();

  const hints = useMemo<Hint[]>(
    () =>
      HINT_KEYS.map((key) => ({
        key,
        title: t(`writing.accessibilityHints.items.${key}.title`),
        body: t(`writing.accessibilityHints.items.${key}.body`),
      })),
    [t]
  );

  return (
    <aside
      role="complementary"
      aria-labelledby={headingId}
      aria-describedby={descriptionId}
      className={clsx(
        'rounded-ds-xl border border-border/60 bg-muted/30 p-5 shadow-sm',
        'focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary/80',
        isRTL ? 'text-right' : 'text-left'
      )}
    >
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('writing.accessibilityHints.badge')}
        </span>
        <h2 id={headingId} className="text-lg font-semibold text-foreground">
          {t('writing.accessibilityHints.title')}
        </h2>
      </div>
      <p id={descriptionId} className="mt-2 text-sm text-muted-foreground">
        {t('writing.accessibilityHints.description')}
      </p>
      <ul className="mt-4 space-y-3" role="list">
        {hints.map((hint) => (
          <li
            key={hint.key}
            className={clsx(
              'flex items-start gap-3 rounded-lg border border-transparent px-3 py-2 transition-colors',
              'hover:border-border/80 hover:bg-background/60',
              isRTL && 'flex-row-reverse'
            )}
          >
            <span
              aria-hidden="true"
              className="mt-1.5 inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-primary"
            />
            <div className={clsx('space-y-1', isRTL ? 'text-right' : 'text-left')}>
              <p className="text-sm font-medium text-foreground">{hint.title}</p>
              <p className="text-sm text-muted-foreground">{hint.body}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted-foreground">
        {t('writing.accessibilityHints.footer')}
      </p>
    </aside>
  );
};

export default AccessibilityHints;
