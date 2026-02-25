// components/exam/ExamTimeWarningPopup.tsx
import React from 'react';
import { Modal } from '@/components/design-system/Modal';
import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';

type ExamTimeWarningPopupProps = {
  open: boolean;
  remainingMinutes: number;
  onClose: () => void;
  onJumpToNav?: () => void;
};

export const ExamTimeWarningPopup: React.FC<ExamTimeWarningPopupProps> = ({
  open,
  remainingMinutes,
  onClose,
  onJumpToNav,
}) => {
  let title = 'Time Warning';
  let message = '';
  let variant: 'warning' | 'danger' = 'warning';

  if (remainingMinutes <= 1) {
    title = 'One Minute Remaining!';
    message = 'You have less than one minute left. Please review your answers quickly.';
    variant = 'danger';
  } else if (remainingMinutes <= 5) {
    title = 'Five Minutes Remaining';
    message = 'You have five minutes left. Make sure you have answered all questions.';
    variant = 'warning';
  } else if (remainingMinutes <= 10) {
    title = 'Ten Minutes Remaining';
    message = 'You have ten minutes left. Keep an eye on the clock.';
    variant = 'warning';
  }

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Icon
            name="clock"
            className={variant === 'danger' ? 'text-red-500' : 'text-amber-500'}
            size={24}
          />
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{message}</p>

        <div className="flex justify-end gap-3 pt-2">
          {onJumpToNav && (
            <Button variant="outline" onClick={onJumpToNav}>
              Jump to navigation
            </Button>
          )}
          <Button variant="primary" onClick={onClose}>
            Continue
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ExamTimeWarningPopup;