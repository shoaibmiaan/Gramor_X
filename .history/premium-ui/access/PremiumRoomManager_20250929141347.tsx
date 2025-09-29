import * as React from 'react';
import { PremiumRoom } from './PremiumRoom';
import { useAuth } from '../../hooks/useAuth'; // Adjust path based on your auth hook

interface PremiumRoomManagerProps {
  roomId: string;
  roomName: string;
  description?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PremiumRoomManager({ 
  roomId, 
  roomName, 
  description, 
  children,
  fallback 
}: PremiumRoomManagerProps) {
  const { user, isLoading } = useAuth(); // Your authentication hook
  
  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="pr-flex pr-items-center pr-justify-center pr-min-h-64">
        <div className="pr-text-center">
          <div className="pr-animate-spin pr-rounded-full pr-h-8 pr-w-8 pr-border-b-2 pr-border-[var(--pr-primary)] pr-mx-auto"></div>
          <p className="pr-mt-4 pr-text-sm pr-text-[var(--pr-fg)]/70">Checking access...</p>
        </div>
      </div>
    );
  }

  // If user is not authenticated, show the fallback (login prompt)
  if (!user) {
    return fallback || (
      <div className="pr-text-center pr-p-8">
        <div className="pr-inline-flex pr-items-center pr-gap-2 pr-px-4 pr-py-2 pr-rounded-full pr-bg-[var(--pr-warning)]/10 pr-text-[var(--pr-warning)] pr-text-sm pr-mb-4">
          🔐 Authentication Required
        </div>
        <h3 className="pr-text-lg pr-font-semibold pr-mb-2">Please log in first</h3>
        <p className="pr-text-sm pr-text-[var(--pr-fg)]/70 pr-mb-6">
          You need to be logged in to access premium content.
        </p>
        <button 
          onClick={() => window.location.href = '/login'} // Adjust based on your routing
          className="pr-px-6 pr-py-2 pr-bg-[var(--pr-primary)] pr-text-white pr-rounded-lg pr-text-sm hover:pr-opacity-90"
        >
          Go to Login
        </button>
      </div>
    );
  }

  // User is authenticated, show the premium room with PIN gate
  return (
    <PremiumRoom
      roomId={roomId}
      roomName={roomName}
      description={description}
    >
      {children}
    </PremiumRoom>
  );
}