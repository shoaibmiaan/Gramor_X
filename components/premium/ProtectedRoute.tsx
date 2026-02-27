// components/ProtectedRoute.tsx
import { useAuth } from '../hooks/useAuth';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="pr-flex pr-items-center pr-justify-center pr-min-h-screen">
        <div className="pr-text-center">
          <div className="pr-animate-spin pr-rounded-full pr-h-8 pr-w-8 pr-border-b-2 pr-border-[var(--pr-primary)] pr-mx-auto"></div>
          <p className="pr-mt-4 pr-text-sm pr-text-[var(--pr-fg)]/70">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login with return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}