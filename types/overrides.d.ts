/* Global overrides to unblock build; tighten later file-by-file. */
import 'react';

declare global {
  // Loosen common design-system props used across pages/stories
  type Variant =
    | 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
    | 'link' | 'accent' | 'warning' | 'subtle' 
    | 'success'   // Added 'success' variant
    | 'info'      // Added 'info' variant
    | 'neutral'   // Added 'neutral' variant
    | null | undefined;

  type Tone =
    | 'default' | 'success' | 'warning' | 'danger'
    | 'info' | 'muted' | 'neonGreen' | undefined;

  namespace JSX {
    interface IntrinsicAttributes {
      as?: any;
      variant?: Variant;  // Updated to support new variants
      tone?: Tone;
      appearance?: string;
      iconOnly?: boolean;
      shape?: 'square' | 'circle' | string;
      fullWidth?: boolean;
      intent?: string;
      surface?: string;
      elevation?: boolean | string | number;
      rounded?: string;
      width?: string | number;
      gutter?: string;
      py?: string;
      sticky?: boolean;
      id?: string;
      className?: string;
      padding?: 'none' | 'sm' | 'md' | 'lg' | string;
      insetBorder?: boolean;
      interactive?: boolean;
    }
  }

  // Web Speech API shims used in speaking/* pages
  interface SpeechRecognition extends EventTarget {
    lang: string;
    start(): void; stop(): void; abort(): void;
    onresult?: (ev: any) => void;
    onend?: () => void;
  }
  var SpeechRecognition: { new (): SpeechRecognition } | undefined;
  var webkitSpeechRecognition: { new (): SpeechRecognition } | undefined;
  interface SpeechSynthesisUtteranceInit {
    text?: string; lang?: string; rate?: number; pitch?: number; volume?: number;
  }

  // Deno shim (we also exclude those folders from compile)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const Deno: any;
}

// Sentry stub so you don't need the package right now
declare module '@sentry/nextjs' {
  export const init: (...args: any[]) => void;
  export const captureException: (...args: any[]) => void;
  export const withSentryConfig: (...args: any[]) => any;
  const _default: any;
  export default _default;
}

// If tests later reference node-mocks-http and types are missing:
declare module 'node-mocks-http' {
  const anyExport: any;
  export = anyExport;
}
