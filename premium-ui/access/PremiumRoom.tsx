import * as React from 'react';
import { PinGate } from './PinGate';
import { PremiumThemeProvider } from '../theme/PremiumThemeProvider';
import { PremiumRoomManager } from './roomUtils';
import { PrCard } from '../components/PrCard';
import { PrButton } from '../components/PrButton';

interface PremiumRoomProps {
  roomId: string;
  roomName: string;
  description?: string;
  onAccessGranted?: () => void;
  onAccessRevoked?: () => void;
  showRoomHeader?: boolean;
  children: React.ReactNode;
}

export function PremiumRoom({ 
  roomId, 
  roomName, 
  description,
  onAccessGranted, 
  onAccessRevoked,
  showRoomHeader = true,
  children 
}: PremiumRoomProps) {
  const [hasAccess, setHasAccess] = React.useState(false);
  const [isChecking, setIsChecking] = React.useState(true);

  React.useEffect(() => {
    // Check if user already has access to this room
    const checkAccess = () => {
      const hasRoomAccess = PremiumRoomManager.hasAccess(roomId);
      setHasAccess(hasRoomAccess);
      
      if (hasRoomAccess) {
        onAccessGranted?.();
      }
      
      setIsChecking(false);
    };

    checkAccess();
  }, [roomId, onAccessGranted]);

  const handlePinSuccess = () => {
    PremiumRoomManager.grantAccess(roomId, roomName);
    setHasAccess(true);
    onAccessGranted?.();
  };

  const handleLeaveRoom = () => {
    PremiumRoomManager.revokeAccess(roomId);
    setHasAccess(false);
    onAccessRevoked?.();
  };

  // Show loading while checking access
  if (isChecking) {
    return (
      <div className="pr-flex pr-items-center pr-justify-center pr-min-h-64">
        <div className="pr-text-center">
          <div className="pr-animate-spin pr-rounded-full pr-h-8 pr-w-8 pr-border-b-2 pr-border-[var(--pr-primary)] pr-mx-auto"></div>
          <p className="pr-mt-4 pr-text-sm pr-text-[var(--pr-fg)]/70">Checking premium access...</p>
        </div>
      </div>
    );
  }

  // Show PIN gate if no access
  if (!hasAccess) {
    return (
      <PinGate 
        onSuccess={handlePinSuccess}
        roomId={roomId}
        roomName={roomName}
        description={description}
      />
    );
  }

  // User has access, show the premium content
  return (
    <PremiumThemeProvider>
      <div className="premium-room-container">
        {/* Premium Room Header */}
        {showRoomHeader && (
          <div className="pr-sticky pr-top-0 pr-z-30 pr-backdrop-blur pr-bg-[color-mix(in_oklab,var(--pr-bg),transparent_80%)] pr-border-b pr-border-[var(--pr-border)]">
            <div className="pr-container pr-mx-auto pr-px-4 pr-py-3">
              <div className="pr-flex pr-items-center pr-justify-between">
                <div className="pr-flex pr-items-center pr-gap-3">
                  <div className="pr-flex pr-items-center pr-gap-2 pr-px-3 pr-py-1 pr-rounded-full pr-bg-gradient-to-r pr-from-[var(--pr-primary)] pr-to-[var(--pr-accent)] pr-text-white pr-text-sm">
                    <span>⭐</span>
                    <span>Premium Room</span>
                  </div>
                  <div>
                    <h1 className="pr-text-lg pr-font-semibold">{roomName}</h1>
                    {description && (
                      <p className="pr-text-sm pr-text-[var(--pr-fg)]/70">{description}</p>
                    )}
                  </div>
                </div>
                <PrButton
                  variant="outline"
                  size="sm"
                  onClick={handleLeaveRoom}
                  className="pr-text-xs"
                >
                  Leave Room
                </PrButton>
              </div>
            </div>
          </div>
        )}
        
        {/* Premium Content */}
        <div className={showRoomHeader ? "pr-container pr-mx-auto pr-p-6" : ""}>
          {children}
        </div>
      </div>
    </PremiumThemeProvider>
  );
}