import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

import { cn } from "@/lib/utils";

/**
 * Root <Dialog> component
 */
const Dialog = DialogPrimitive.Root;

/**
 * Trigger element
 */
const DialogTrigger = DialogPrimitive.Trigger;

/**
 * Portal wrapper
 */
const DialogPortal = ({
  className,
  ...props
}: DialogPrimitive.DialogPortalProps & { className?: string }) => (
  <DialogPrimitive.Portal {...props} className={className} />
);

/**
 * Backdrop Overlay
 */
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    {...props}
    className={cn(
      "fixed inset-0 z-40 bg-background/80",
      "backdrop-blur-md supports-[backdrop-filter]:backdrop-blur-lg",
      "data-[state=open]:animate-in data-[state=open]:fade-in-0",
      "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
      className
    )}
  />
));
DialogOverlay.displayName = "DialogOverlay";

/**
 * Main content container
 */
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      {...props}
      className={cn(
        "fixed left-1/2 top-1/2 z-50",
        "w-full max-w-lg translate-x-[-50%] translate-y-[-50%]",
        "rounded-xl border border-border bg-background",
        "shadow-xl p-6",
        "duration-200",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        className
      )}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = "DialogContent";

/**
 * Title element
 */
const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    {...props}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
  />
));
DialogTitle.displayName = "DialogTitle";

/**
 * Description text
 */
const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    {...props}
    className={cn(
      "text-sm text-muted-foreground",
      className
    )}
  />
));
DialogDescription.displayName = "DialogDescription";

/**
 * Header block
 */
const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    {...props}
    className={cn(
      "flex flex-col space-y-1.5 text-left",
      className
    )}
  />
);
DialogHeader.displayName = "DialogHeader";

/**
 * Footer block
 */
const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    {...props}
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end gap-2",
      className
    )}
  />
);
DialogFooter.displayName = "DialogFooter";

export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
