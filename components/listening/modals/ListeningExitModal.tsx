// components/listening/modals/ListeningExitModal.tsx
import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/design-system/Dialog';
import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';

type ListeningExitModalProps = {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export const ListeningExitModal: React.FC<ListeningExitModalProps> = ({
  open,
  onConfirm,
  onCancel,
}) => {
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm rounded-ds-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="alert-triangle" className="h-4 w-4 text-destructive" />
            Exit Listening test?
          </DialogTitle>
          <DialogDescription>
            If you exit now, this attempt will be submitted and you won&apos;t be
            able to continue the audio or change your answers. This is final.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 rounded-lg bg-muted/80 p-3 text-xs text-muted-foreground">
          <p>
            • Your current answers will be saved and scored. <br />
            • You can review results after exiting. <br />
            • You cannot restart this same attempt.
          </p>
        </div>

        <DialogFooter className="mt-3 flex w-full flex-row justify-end gap-2">
          <Button
            tone="neutral"
            variant="ghost"
            size="sm"
            type="button"
            onClick={onCancel}
          >
            Stay in test
          </Button>
          <Button
            tone="destructive"
            size="sm"
            type="button"
            onClick={onConfirm}
          >
            Exit &amp; submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
