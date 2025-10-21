import * as React from 'react';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export type HeadingSize = 'display' | 'xl' | 'lg' | 'md' | 'sm' | 'xs';
export type HeadingAlign = 'left' | 'center' | 'right';

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: `h${1 | 2 | 3 | 4 | 5 | 6}`;
  size?: HeadingSize;
  align?: HeadingAlign;
  subtle?: boolean;
}

const sizeMap: Record<HeadingSize, string> = {
  display: 'text-display font-semibold',
  xl: 'text-h1 font-semibold',
  lg: 'text-h2 font-semibold',
  md: 'text-h3 font-semibold',
  sm: 'text-h4 font-semibold',
  xs: 'text-h5 font-medium',
};

const alignMap: Record<HeadingAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  (
    { as = 'h2', size = 'lg', align = 'left', subtle = false, className, children, ...props },
    ref,
  ) => {
    const Comp = as;
    return (
      <Comp
        ref={ref}
        className={cx(
          'font-slab tracking-tight',
          sizeMap[size],
          alignMap[align],
          subtle ? 'text-muted-foreground' : 'text-foreground',
          className,
        )}
        {...props}
      >
        {children}
      </Comp>
    );
  },
);

Heading.displayName = 'Heading';

export default Heading;
