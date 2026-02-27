import React from 'react';
import { Modal } from '@/components/design-system/Modal';
import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';
import { cn } from '@/lib/utils';

type FlagSummaryModalProps = {
  open: boolean;
  onClose: () => void;
  flaggedQuestions: Array<{
    id: string;
    number: number;
    prompt: string;
    passageTitle?: string;
  }>;
  onJumpToQuestion: (id: string) => void;
};

export const FlagSummaryModal: React.FC<FlagSummaryModalProps> = ({
  open,
  onClose,
  flaggedQuestions,
  onJumpToQuestion,
}) => {
  return (
    <Modal open={open} onClose={onClose} size="lg">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Icon name="flag" className="text-amber-500" />
            Flagged Questions ({flaggedQuestions.length})
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <Icon name="X" />
          </Button>
        </div>

        {flaggedQuestions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No flagged questions.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {flaggedQuestions.map((q) => (
              <div
                key={q.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border/60 hover:bg-muted/40 cursor-pointer"
                onClick={() => {
                  onJumpToQuestion(q.id);
                  onClose();
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-xs font-medium">
                      {q.number}
                    </span>
                    <span className="text-sm font-medium truncate">{q.prompt}</span>
                  </div>
                  {q.passageTitle && (
                    <p className="text-xs text-muted-foreground mt-1 ml-8">{q.passageTitle}</p>
                  )}
                </div>
                <Icon name="chevron-right" className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};