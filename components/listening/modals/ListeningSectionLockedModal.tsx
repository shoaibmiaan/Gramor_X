// components/listening/modals/ListeningSectionLockedModal.tsx
import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/design-system/Dialog';
import { Button } from '@/components/design-system/Button';

type ListeningSectionLockedModalProps = {
  open: boolean;
  onClose: () => void;
};

export const ListeningSectionLockedModal: React.FC<ListeningSectionLockedModalProps> =
  ({ open, onClose }) => {
    const handleOpenChange = (nextOpen: boolean) => {
      if (!nextOpen) onClose();
    };

    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-sm rounded-ds-2xl">
          <DialogHeader>
            <DialogTitle>Section locked</DialogTitle>
            <DialogDescription>
              You can&apos;t jump to this section yet. Follow the test order and
              finish the current audio first.
            </DialogDescription>
          </DialogHeader>

          <p className="mt-2 text-xs text-muted-foreground">
            IELTS Listening is strictly linear: once a section&apos;s audio
            starts, you must complete it before moving on. This keeps the mock
            experience realistic.
          </p>

          <div className="mt-3 flex justify-end">
            <Button
              tone="primary"
              size="sm"
              type="button"
              onClick={onClose}
            >
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };
