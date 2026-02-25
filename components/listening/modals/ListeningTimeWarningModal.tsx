// components/listening/modals/ListeningTimeWarningModal.tsx
import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/design-system/Dialog';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';

type ListeningTimeWarningModalProps = {
  open: boolean;
  remainingSeconds: number;
  onClose: () => void;
};

export const ListeningTimeWarningModal: React.FC<ListeningTimeWarningModalProps> =
  ({ open, remainingSeconds, onClose }) => {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;

    const handleOpenChange = (nextOpen: boolean) => {
      if (!nextOpen) onClose();
    };

    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-sm rounded-ds-2xl">
          <DialogHeader>
            <DialogTitle>Time almost up</DialogTitle>
            <DialogDescription>
              You&apos;re close to the end of this Listening test. Make sure
              you&apos;ve answered every question you can.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 flex items-center justify-between rounded-lg bg-muted/80 p-3">
            <div>
              <p className="text-xs text-muted-foreground">Remaining time</p>
              <p className="text-lg font-semibold tabular-nums">
                {minutes.toString().padStart(2, '0')}:
                {seconds.toString().padStart(2, '0')}
              </p>
            </div>
            <Badge tone="warning">Hurry up</Badge>
          </div>

          <p className="mt-2 text-xs text-muted-foreground">
            Focus on any unanswered questions first. You can still change your
            answers until time runs out.
          </p>

          <div className="mt-3 flex justify-end">
            <Button
              tone="primary"
              size="sm"
              type="button"
              onClick={onClose}
            >
              Continue answering
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };
