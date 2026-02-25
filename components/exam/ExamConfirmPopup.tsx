import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/design-system/Dialog";
import { Button } from "@/components/design-system/Button";
import { Icon } from "@/components/design-system/Icon";

type ExamConfirmPopupProps = {
  open: boolean;
  unanswered: number;
  onCancel: () => void;
  onConfirm: () => void;
};

const ExamConfirmPopup: React.FC<ExamConfirmPopupProps> = ({
  open,
  unanswered,
  onCancel,
  onConfirm,
}) => {
  return (
    <Dialog open={open}>
      <DialogContent className="max-w-sm bg-background/95 border border-border/80 backdrop-blur-lg shadow-xl rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-300">
              <Icon name="alert-triangle" className="h-5 w-5" />
            </div>
            <DialogTitle className="text-lg font-semibold">
              Submit attempt?
            </DialogTitle>
          </div>
          <DialogDescription className="mt-3 text-sm text-muted-foreground">
            You still have{" "}
            <span className="font-semibold text-foreground">
              {unanswered} unanswered
              {unanswered === 1 ? " question" : " questions"}
            </span>
            . Once you submit, you can’t change your answers.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6 flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={onCancel}
            className="min-w-[100px]"
          >
            Review again
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            className="min-w-[110px]"
          >
            Submit anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExamConfirmPopup;
export { ExamConfirmPopup };
