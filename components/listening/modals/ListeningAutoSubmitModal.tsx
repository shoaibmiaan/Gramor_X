// components/listening/modals/ListeningAutoSubmitModal.tsx
import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/design-system/Dialog';
import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';

type ListeningAutoSubmitModalProps = {
  open: boolean;
  onViewResults: () => void;
};

export const ListeningAutoSubmitModal: React.FC<ListeningAutoSubmitModalProps> = ({
  open,
  onViewResults,
}) => {
  const handleOpenChange = (nextOpen: boolean) => {
    // Once it opens, we usually keep it until user clicks "View results"
    if (!nextOpen) onViewResults();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm rounded-ds-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="clock" className="h-4 w-4 text-primary" />
            Time&apos;s up – test submitted
          </DialogTitle>
          <DialogDescription>
            The timer hit zero, so your Listening attempt has been submitted
            automatically, just like a real IELTS exam.
          </DialogDescription>
        </DialogHeader>

        <p className="mt-2 text-xs text-muted-foreground">
          You can&apos;t change your answers anymore, but you can review your
          performance, see band estimates, and analyse your weak areas.
        </p>

        <div className="mt-3 flex justify-end">
          <Button
            tone="primary"
            size="sm"
            type="button"
            onClick={onViewResults}
          >
            View results
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
