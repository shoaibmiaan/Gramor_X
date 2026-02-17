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

type ExamTimeWarningPopupProps = {
  open: boolean;
  remainingMinutes: number;
  onClose: () => void;
  onJumpToNav?: () => void;
};

const ExamTimeWarningPopup: React.FC<ExamTimeWarningPopupProps> = ({
  open,
  remainingMinutes,
  onClose,
  onJumpToNav,
}) => {
  const minutesLabel =
    remainingMinutes <= 0
      ? "less than a minute"
      : `${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}`;

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-sm bg-background/95 border border-border/80 backdrop-blur-lg shadow-xl rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-300">
              <Icon name="alarm-clock" className="h-5 w-5" />
            </div>
            <DialogTitle className="text-lg font-semibold">
              Time is almost over
            </DialogTitle>
          </div>
          <DialogDescription className="mt-3 text-sm text-muted-foreground">
            You have{" "}
            <span className="font-semibold text-foreground">
              {minutesLabel}
            </span>{" "}
            remaining. Make sure you’ve answered as many questions as possible.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-3 rounded-md bg-muted/70 px-3 py-2 text-xs text-muted-foreground">
          Focus on quick wins now. Guess any remaining questions instead of
          leaving them blank.
        </div>

        <DialogFooter className="mt-6 flex justify-end gap-2">
          {onJumpToNav && (
            <Button
              variant="secondary"
              onClick={() => {
                onJumpToNav();
                onClose();
              }}
              className="min-w-[130px]"
            >
              Review unanswered
            </Button>
          )}
          <Button variant="primary" onClick={onClose} className="min-w-[90px]">
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExamTimeWarningPopup;
export { ExamTimeWarningPopup };
