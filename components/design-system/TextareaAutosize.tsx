// components/design-system/TextareaAutosize.tsx
// Tailwind-friendly textarea that automatically grows with content.

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import clsx from 'clsx';

type TextareaAutosizeProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  minRows?: number;
  maxRows?: number;
};

const resize = (node: HTMLTextAreaElement | null, minRows = 4, maxRows = 20) => {
  if (!node) return;
  const lineHeight = parseInt(getComputedStyle(node).lineHeight || '24', 10);
  node.style.height = 'auto';
  const rows = Math.min(maxRows, Math.max(minRows, Math.round(node.scrollHeight / lineHeight)));
  node.style.height = `${rows * lineHeight}px`;
};

export const TextareaAutosize = forwardRef<HTMLTextAreaElement, TextareaAutosizeProps>(
  ({ className, minRows = 4, maxRows = 24, onChange, value, ...props }, ref) => {
    const innerRef = useRef<HTMLTextAreaElement | null>(null);

    useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement);

    const handleRef = useCallback((node: HTMLTextAreaElement | null) => {
      innerRef.current = node;
      if (node) resize(node, minRows, maxRows);
    }, [maxRows, minRows]);

    useEffect(() => {
      if (!innerRef.current) return;
      resize(innerRef.current, minRows, maxRows);
    }, [value, minRows, maxRows]);

    return (
      <textarea
        ref={handleRef}
        className={clsx(
          'w-full resize-none rounded-lg border border-border bg-background px-4 py-3 font-sans text-base text-foreground shadow-inner focus:outline-none focus:ring-2 focus:ring-primary',
          className,
        )}
        rows={minRows}
        value={value}
        onChange={(event) => {
          onChange?.(event);
          resize(event.currentTarget, minRows, maxRows);
        }}
        {...props}
      />
    );
  },
);

TextareaAutosize.displayName = 'TextareaAutosize';

export default TextareaAutosize;
