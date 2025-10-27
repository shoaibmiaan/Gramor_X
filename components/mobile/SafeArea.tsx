/* eslint-disable ds-guard/no-inline-style */
import React from 'react';
import clsx from 'clsx';
import type { ComponentType, CSSProperties, HTMLAttributes } from 'react';

export type SafeAreaProps<T extends keyof JSX.IntrinsicElements | ComponentType<any> = 'div'> = {
  as?: T;
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
  padding?: number | { top?: number; bottom?: number; left?: number; right?: number };
} & Omit<HTMLAttributes<HTMLElement>, 'as'>;

type InferProps<T> = T extends keyof JSX.IntrinsicElements
  ? JSX.IntrinsicElements[T]
  : T extends ComponentType<infer P>
  ? P
  : never;

export function SafeArea<T extends keyof JSX.IntrinsicElements | ComponentType<any> = 'div'>(
  props: SafeAreaProps<T> & InferProps<T>,
) {
  const { as, top, bottom, left, right, padding, className, style, ...rest } = props as SafeAreaProps & {
    className?: string;
    style?: CSSProperties;
  };

  const Component = (as ?? 'div') as any;

  const resolvedPadding = typeof padding === 'number'
    ? { top: padding, bottom: padding, left: padding, right: padding }
    : padding ?? {};

  const toCss = (value: number | string | undefined) => {
    if (typeof value === 'number') return `${value}px`;
    if (typeof value === 'string') return value;
    return '0px';
  };

  const safeStyle: CSSProperties = { ...style };

  if (top) {
    safeStyle.paddingTop = `calc(${toCss(resolvedPadding.top)} + env(safe-area-inset-top, 0px))`;
  } else if (resolvedPadding.top !== undefined) {
    safeStyle.paddingTop = toCss(resolvedPadding.top);
  }

  if (bottom) {
    safeStyle.paddingBottom = `calc(${toCss(resolvedPadding.bottom)} + env(safe-area-inset-bottom, 0px))`;
  } else if (resolvedPadding.bottom !== undefined) {
    safeStyle.paddingBottom = toCss(resolvedPadding.bottom);
  }

  if (left) {
    safeStyle.paddingLeft = `calc(${toCss(resolvedPadding.left)} + env(safe-area-inset-left, 0px))`;
  } else if (resolvedPadding.left !== undefined) {
    safeStyle.paddingLeft = toCss(resolvedPadding.left);
  }

  if (right) {
    safeStyle.paddingRight = `calc(${toCss(resolvedPadding.right)} + env(safe-area-inset-right, 0px))`;
  } else if (resolvedPadding.right !== undefined) {
    safeStyle.paddingRight = toCss(resolvedPadding.right);
  }

  /* eslint-disable-next-line ds-guard/no-inline-style */
  return <Component className={clsx(className)} style={safeStyle} {...rest} />;
}

export default SafeArea;
