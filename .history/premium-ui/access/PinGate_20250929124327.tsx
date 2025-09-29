import React, { useState, useEffect } from 'react';
import { PrCard } from '../components/PrCard';
import { PrButton } from '../components/PrButton';

interface PinGateProps {
  roomId: string;
  roomName: string;
  onSuccess: () => void;
  maxAttempts?: number;
}

const PinGate: React.FC<PinGateProps> = ({
  roomId,
  roomName,
  onSuccess,
  maxAttempts = 3
}) => {
  const [pin, setPin] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // In a real app, this would be fetched from your backend
  const validPins: Record<string, string> = {
    'premium-room-1': '1234',
    'premium-room-2': '5678',
    'exam-room': '9999'
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    if (pin === validPins[roomId]) {
      setLoading(false);
      onSuccess();
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setLoading(false);
      
      if (newAttempts >= maxAttempts) {
        setError('Maximum attempts reached. Please try again later.');
      } else {
        setError(`Invalid PIN. ${maxAttempts - newAttempts} attempts remaining.`);
      }
      setPin('');
    }
  };

  const handlePinChange = (value: string) => {
    // Only allow numeric input and limit to 4 digits
    if (/^\d*$/.test(value) && value.length <= 4) {
      setPin(value);
      setError('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <PrCard className="w-full max-w-md">
        <div className="text-center p-6">
          {/* Premium Badge */}
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-sm font-medium mb-4">
            <span className="mr-1">⭐</span>
            PREMIUM ROOM
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {roomName}
          </h1>
          <p className="text-gray-600 mb-6">
            Enter your PIN to access this premium content
          </p>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
                Access PIN
              </label>
              <input
                id="pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pin}
                onChange={(e) => handlePinChange(e.target.value)}
                className="w-full px-4 py-3 text-center text-2xl font-semibold tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="••••"
                maxLength={4}
                autoComplete="off"
                disabled={loading || attempts >= maxAttempts}
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <PrButton
              type="submit"
              disabled={pin.length !== 4 || loading || attempts >= maxAttempts}
              loading={loading}
              className="w-full py-3"
              variant="premium"
            >
              {loading ? 'Verifying...' : 'Enter Room'}
            </PrButton>
          </form>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              🔒 Secure Access
            </h3>
            <p className="text-xs text-gray-600">
              This room contains premium content protected by PIN authentication. 
              Only registered users with valid PIN can access.
            </p>
          </div>
        </div>
      </PrCard>
    </div>
  );
};

export default PinGate;