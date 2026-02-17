import * as React from 'react';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export type SeparatorOrientation = 'horizontal' | 'vertical';

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: SeparatorOrientation;
  decorative?: boolean;
}

export const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ orientation = 'horizontal', decorative = false, className, role, ...props }, ref) => {
    const base = orientation === 'horizontal' ? 'h-px w-full' : 'w-px h-full';
    const ariaRole = role ?? (decorative ? 'presentation' : 'separator');
    return (
      <div
        ref={ref}
        role={ariaRole}
        aria-orientation={orientation}
        aria-hidden={decorative ? 'true' : undefined}
        className={cx('bg-border/80', base, className)}
        {...props}
      />
    );
  },
);

Separator.displayName = 'Separator';

export default Separator;
