import * as React from 'react';
import { Input } from './Input';
import type { InputProps } from './Input';
import { Icon } from '@/components/design-system/Icon';

type PasswordProps = Omit<InputProps, 'type' | 'rightSlot'>;

export const PasswordInput: React.FC<PasswordProps> = (props) => {
  const [show, setShow] = React.useState(false);
  return (
    <Input
      {...props}
      type={show ? 'text' : 'password'}
      rightSlot={
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="p-1 text-slate-500 hover:text-slate-900"
        >
          <Icon name={show ? 'eye-off' : 'eye'} aria-hidden />
        </button>
      }
    />
  );
};

export default PasswordInput;
