import type { PropsWithChildren } from 'react';
import RouteProgressBar from '@/components/loading/RouteProgressBar';

export default function LoadingProvider({ children }: PropsWithChildren) {
  return (
    <>
      <RouteProgressBar />
      {children}
    </>
  );
}
