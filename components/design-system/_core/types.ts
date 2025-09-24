import * as React from 'react';

export type ClassValue = string | false | null | undefined;
export function cx(...v: ClassValue[]) { return v.filter(Boolean).join(' '); }

/** Design-system unions */
export type Variant =
  | 'primary' | 'secondary' | 'outline' | 'ghost'
  | 'link' | 'accent' | 'warning' | 'danger'
  | 'error' | 'success' | 'info' | 'subtle';

export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type Tone =
  | 'default' | 'muted' | 'success' | 'warning'
  | 'danger' | 'info' | 'neonGreen';

/** Simple polymorphic typing */
export type AsProp<E extends React.ElementType = React.ElementType> = {
  as?: any;
};

export type PolymorphicProps<E extends React.ElementType, P> =
  AsProp<E> & Omit<React.ComponentPropsWithoutRef<E>, keyof P | 'as'> & P;
