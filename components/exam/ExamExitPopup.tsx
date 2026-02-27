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

type ExamExitPopupProps = {
  open: boolean;
  unanswered?: number;
  onCancel: () => void;
  onExit: () => void;
};

const ExamExitPopup: React.FC<ExamExitPopupProps> = ({
  open,
  unanswered,
  onCancel,
  onExit,
}) => {
  const hasUnanswered = typeof unanswered === "number" && unanswered > 0;

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-sm bg-background/95 border border-border/80 backdrop-blur-lg shadow-xl rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Icon name="log-out" className="h-5 w-5" />
            </div>
            <DialogTitle className="text-lg font-semibold">
              Exit test?
            </DialogTitle>
          </div>
          <DialogDescription className="mt-3 text-sm text-muted-foreground">
            If you exit now, this attempt may be{" "}
            <span className="font-semibold text-foreground">
              auto-submitted or lost
            </span>{" "}
            depending on exam rules.
          </DialogDescription>
        </DialogHeader>

        {hasUnanswered && (
          <div className="mt-3 rounded-md bg-muted/70 px-3 py-2 text-xs text-muted-foreground">
            You still have{" "}
            <span className="font-semibold text-destructive">
              {unanswered} unanswered
              {unanswered === 1 ? " question" : " questions"}
            </span>
            . Exiting now is not recommended.
          </div>
        )}

        <DialogFooter className="mt-6 flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={onCancel}
            className="min-w-[110px]"
          >
            Stay in test
          </Button>
          <Button
            variant="destructive"
            onClick={onExit}
            className="min-w-[110px]"
          >
            Exit anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExamExitPopup;
export { ExamExitPopup };
