// Global type declarations
declare global {
  interface ServiceWorkerRegistration {
    sync?: {
      register(tag: string): Promise<void>;
    };
  }
}

// Module augmentations
declare module '@sentry/nextjs' {
  export * from '@sentry/nextjs/types';
}

// Extend window interface if needed
interface Window {
  gtag?: any;
}

export {};