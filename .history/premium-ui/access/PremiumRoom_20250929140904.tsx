import * as React from 'react';
import { PinGate } from './PinGate';
import { PremiumThemeProvider } from '../theme/PremiumThemeProvider';
import { PrCard } from '../components/PrCard';

interface PremiumRoomProps {
  roomId: string;
  roomName: string;
  description?: string;
  onAccessGranted?: () => void;
  children: React.ReactNode;
}

export function PremiumRoom({ 
  roomId, 
  roomName, 
  description,
  onAccessGranted, 
  children 
}: PremiumRoomProps) {
  const [hasAccess, setHasAccess] = React.useState(false);

  React.useEffect(() => {
    // Check if user already has access to this room
    const accessedRooms = JSON.parse(localStorage.getItem('premiumRooms') || '{}');
    if (accessedRooms[roomId]) {
      setHasAccess(true);
      onAccessGranted?.();
    }
  }, [roomId, onAccessGranted]);

  const handleSuccess = () => {
    // Store access in localStorage
    const accessedRooms = JSON.parse(localStorage.getItem('premiumRooms') || '{}');
    accessedRooms[roomId] = {
      accessedAt: new Date().toISOString(),
      roomName,
      roomId
    };
    localStorage.setItem('premiumRooms', JSON.stringify(accessedRooms));
    
    setHasAccess(true);
    onAccessGranted?.();
  };

  if (!hasAccess) {
    return (
      <PinGate 
        onSuccess={handleSuccess}
        roomId={roomId}
        roomName={roomName}
        description={description}
      />
    );
  }

  return (
    <PremiumThemeProvider>
      <div className="premium-room-content">
        {children}
      </div>
    </PremiumThemeProvider>
  );
}