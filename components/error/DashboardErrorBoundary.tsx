// components/error/DashboardErrorBoundary.tsx
import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function DashboardErrorBoundary({ children, fallback }: Props) {
  try {
    return <>{children}</>;
  } catch (error) {
    return fallback ? <>{fallback}</> : <div>Something went wrong</div>;
  }
}

export default DashboardErrorBoundary;
