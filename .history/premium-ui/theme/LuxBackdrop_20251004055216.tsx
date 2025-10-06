// premium-ui/theme/LuxBackdrop.tsx
import * as React from 'react';

/**
 * Global animated backdrop for Premium themes.
 * Renders behind page content; respects prefers-reduced-motion.
 */
export function LuxBackdrop({ enabled = true }: { enabled?: boolean }) {
  if (!enabled) return null;
  return (
    <div className="lux-outer" aria-hidden="true">
      <div className="lux-inner" />
    </div>
  );
}
