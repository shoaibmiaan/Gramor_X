import * as React from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Watch the user's reduced-motion preference. Returns `true` when animations should be avoided.
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    try {
      return window.matchMedia(QUERY).matches;
    } catch (error) {
      console.warn('[usePrefersReducedMotion] matchMedia failed', error);
      return false;
    }
  });

  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(QUERY);

    const updatePreference = (event: MediaQueryListEvent | MediaQueryList) => {
      setPrefersReducedMotion(event.matches);
    };

    // Sync in case server-rendered default differs from client preference.
    updatePreference(mediaQuery);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updatePreference);
      return () => mediaQuery.removeEventListener('change', updatePreference);
    }

    // Fallback for older browsers.
    mediaQuery.addListener(updatePreference);
    return () => mediaQuery.removeListener(updatePreference);
  }, []);

  return prefersReducedMotion;
}

export default usePrefersReducedMotion;
