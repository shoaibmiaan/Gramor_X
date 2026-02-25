// lib/hooks/useDebouncedEffect.ts
import * as React from 'react';

export function useDebouncedEffect(fn: () => void, deps: React.DependencyList, delay = 300) {
  React.useEffect(() => {
    const t = setTimeout(fn, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delay]);
}
