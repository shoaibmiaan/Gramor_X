// premium-ui/theme/ThemeSwitcher.tsx
import * as React from 'react';
import { PREMIUM_THEMES, type PremiumThemeId } from './premium-themes';
import { usePremiumTheme } from './PremiumThemeProvider';

function dotClass(id: PremiumThemeId) {
  return `pr-theme-dot pr-theme-dot--${id}`;
}

export function ThemeSwitcherPremium() {
  const { theme, setTheme } = usePremiumTheme();

  return (
    <div className="pr-grid pr-grid-cols-2 pr-gap-2 pr-p-2 pr-rounded-2xl pr-bg-[var(--pr-card)] pr-border pr-border-[var(--pr-border)]">
      {PREMIUM_THEMES.map((t) => {
        const active = theme === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setTheme(t.id)}
            aria-pressed={active}
            className={[
              'pr-group pr-flex pr-items-center pr-gap-2 pr-rounded-xl pr-px-3 pr-py-2',
              'pr-border pr-transition-all',
              active
                ? 'pr-border-[var(--pr-primary)] pr-bg-[color-mix(in oklab,var(--pr-primary),var(--pr-bg) 88%)]'
                : 'pr-border-[var(--pr-border)] hover:pr-bg-[color-mix(in oklab,var(--pr-fg),var(--pr-bg) 94%)]',
            ].join(' ')}
            title={t.label}
          >
            <span className={dotClass(t.id)} />
            <span className="pr-text-small">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
