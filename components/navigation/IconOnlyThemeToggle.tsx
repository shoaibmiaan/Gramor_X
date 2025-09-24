'use client';

import { useTheme } from 'next-themes';
import { Icon } from '@/components/design-system/Icon';

export function IconOnlyThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const currentTheme = theme ?? resolvedTheme;
  const isDark = currentTheme === 'dark';

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="
        inline-flex h-10 w-10 items-center justify-center rounded-lg
        hover:bg-muted transition
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background
      "
    >
      {isDark ? (
        <Icon name="Sun" className="h-5 w-5" aria-hidden />
      ) : (
        <Icon name="Moon" className="h-5 w-5" aria-hidden />
      )}
    </button>
  );
}
