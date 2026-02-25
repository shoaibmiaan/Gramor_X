// File: components/navigation/IconOnlyThemeToggle.tsx
'use client';

import { useTheme } from 'next-themes';
import { motion } from 'framer-motion'; // Added for smooth toggle animation
import { Icon } from '@/components/design-system/Icon';

export function IconOnlyThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const currentTheme = theme ?? resolvedTheme;
  const isDark = currentTheme === 'dark';

  return (
    <motion.button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="
        inline-flex h-10 w-10 items-center justify-center rounded-lg
        hover:bg-muted dark:hover:bg-muted-dark transition
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border dark:focus-visible:ring-border-dark focus-visible:ring-offset-2 focus-visible:ring-offset-background
      "
    >
      <motion.div
        animate={{ rotate: isDark ? 180 : 0 }}
        transition={{ duration: 0.3 }}
      >
        {isDark ? (
          <Icon name="Sun" className="h-5 w-5" aria-hidden />
        ) : (
          <Icon name="Moon" className="h-5 w-5" aria-hidden />
        )}
      </motion.div>
    </motion.button>
  );
}