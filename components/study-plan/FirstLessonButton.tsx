import React from 'react';
import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';

interface FirstLessonButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}

export const FirstLessonButton: React.FC<FirstLessonButtonProps> = ({
  onClick,
  disabled = false,
  className = '',
  label = 'Start first lesson',
}) => {
  return (
    <Button
      size="lg"
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      <Icon name="play" className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
};