'use client';

import * as React from 'react';
import { Input } from './Input';
import type { InputProps } from './Input';
import { Icon } from '@/components/design-system/Icon';

type PasswordProps = Readonly<Omit<InputProps, 'type' | 'rightSlot'>>;

export const PasswordInput: React.FC<PasswordProps> = (props) => {
  const [show, setShow] = React.useState(false);
  const title = show ? 'Hide password' : 'Show password';

  return (
    <Input
      {...props}
      type={show ? 'text' : 'password'}
      autoComplete={props.autoComplete ?? 'current-password'}
      rightSlot={
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={title}
          className="p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-ds-lg"
        >
          <Icon name={show ? 'eye-off' : 'eye'} aria-hidden title={title} />
        </button>
      }
    />
  );
};

export default PasswordInput;
