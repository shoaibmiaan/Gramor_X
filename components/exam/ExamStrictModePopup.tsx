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

type ExamStrictModePopupProps = {
  open: boolean;
  onAcknowledge: () => void;
};

const ExamStrictModePopup: React.FC<ExamStrictModePopupProps> = ({
  open,
  onAcknowledge,
}) => {
  return (
    <Dialog open={open}>
      <DialogContent className="max-w-lg bg-background/95 border border-border/80 backdrop-blur-lg shadow-xl rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Icon name="shield-alert" className="h-5 w-5" />
            </div>
            <DialogTitle className="text-lg font-semibold">
              Strict IELTS Computer-Based Mode
            </DialogTitle>
          </div>
          <DialogDescription className="mt-3 text-sm text-muted-foreground">
            This test runs in strict exam mode. Your time keeps running, and
            your actions are monitored for fairness.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          <div className="font-medium text-foreground">Please note:</div>
          <ul className="list-disc space-y-1 pl-5">
            <li>The timer never pauses, even if you switch tabs or windows.</li>
            <li>Refreshing or closing the tab may auto-submit your attempt.</li>
            <li>Multiple tab-switches can lock your attempt for review.</li>
            <li>Use the built-in navigation to move between passages and questions.</li>
          </ul>
        </div>

        <div className="mt-4 rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          Tip: Make sure your internet is stable and notifications are muted
          before you continue.
        </div>

        <DialogFooter className="mt-6 flex justify-end gap-2">
          <Button
            variant="primary"
            onClick={onAcknowledge}
            className="min-w-[140px]"
          >
            I understand, start test
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExamStrictModePopup;
export { ExamStrictModePopup };
