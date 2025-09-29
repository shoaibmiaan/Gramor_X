import React, { useState, useEffect } from 'react';
import { PrCard } from '../components/PrCard';
import { PrButton } from '../components/PrButton';
import PinGate from './PinGate';
import { PremiumThemeProvider } from '../theme/PremiumThemeProvider';

interface PremiumRoomProps {
  roomId: string;
  roomName: string;
  onAccessGranted: () => void;
  children: React.ReactNode;
}

export const PremiumRoom: React.FC<PremiumRoomProps> = ({
  roomId,
  roomName,
  onAccessGranted,
  children
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user already has access to this room
    const checkExistingAccess = () => {
      const accessedRooms = JSON.parse(localStorage.getItem('premiumRooms') || '{}');
      if (accessedRooms[roomId]) {
        setIsAuthenticated(true);
        onAccessGranted();
      }
    };
    
    checkExistingAccess();
  }, [roomId, onAccessGranted]);

  const handlePinSuccess = () => {
    // Store access in localStorage
    const accessedRooms = JSON.parse(localStorage.getItem('premiumRooms') || '{}');
    accessedRooms[roomId] = {
      accessedAt: new Date().toISOString(),
      roomName
    };
    localStorage.setItem('premiumRooms', JSON.stringify(accessedRooms));
    
    setIsAuthenticated(true);
    onAccessGranted();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading premium room...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <PremiumThemeProvider>
        <PinGate 
          roomId={roomId}
          roomName={roomName}
          onSuccess={handlePinSuccess}
        />
      </PremiumThemeProvider>
    );
  }

  return (
    <PremiumThemeProvider>
      <div className="premium-room-container">
        {children}
      </div>
    </PremiumThemeProvider>
  );
};

export default PremiumRoom;