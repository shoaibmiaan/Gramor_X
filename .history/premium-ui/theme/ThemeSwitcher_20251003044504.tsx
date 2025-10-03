// premium-ui/theme/ThemeSwitcher.tsx
import * as React from 'react';
import { PREMIUM_THEMES } from './premium-themes';
import { usePremiumTheme } from './PremiumThemeProvider';

export function ThemeSwitcherPremium() {
  const { theme, setTheme } = usePremiumTheme();

  return (
    <div className="pr-inline-flex pr-gap-2 pr-p-2 pr-rounded-2xl pr-bg-[var(--pr-card)] pr-border pr-border-[var(--pr-border)] pr-shadow-sm">
      {PREMIUM_THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setTheme(t.id)}
          aria-pressed={theme === t.id}
          className={[
            'pr-w-[88px] pr-h-[72px] pr-flex pr-flex-col pr-items-center pr-justify-center pr-gap-1 pr-rounded-xl pr-text-xs pr-transition',
            theme === t.id
              ? 'pr-ring-2 pr-ring-[var(--pr-primary)] pr-ring-offset-2 pr-ring-offset-[var(--pr-card)]'
              : 'pr-border pr-border-[var(--pr-border)] hover:pr-bg-[color-mix(in oklab,var(--pr-card),white 12%)]',
          ].join(' ')}
          title={t.label}
        >
          <span
            className="pr-w-6 pr-h-6 pr-rounded-md"
            style={{ background: t.preview, backgroundSize: 'cover', backgroundPosition: 'center' }}
          />
          <span className="pr-whitespace-nowrap">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
