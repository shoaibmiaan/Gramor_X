import * as React from 'react';
import { PrButton } from '../components/PrButton';
import { PrCard } from '../components/PrCard';
import { PremiumThemeProvider } from '../theme/PremiumThemeProvider';

type PinGateProps = {
  onSuccess?: () => void;
  roomId?: string;
  roomName?: string;
  description?: string;
  maxAttempts?: number;
};

export function PinGate({ 
  onSuccess, 
  roomId, 
  roomName = 'Premium Room',
  description = 'Enter your PIN to access this exclusive content',
  maxAttempts = 3 
}: PinGateProps) {
  const [pin, setPin] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [attempts, setAttempts] = React.useState(0);

  const handlePinChange = (value: string) => {
    // Only allow numeric input and limit to 4 digits
    if (/^\d*$/.test(value) && value.length <= 4) {
      setPin(value);
      if (error) setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || loading || pin.length !== 4) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call - replace with your actual endpoint
      const res = await fetch('/api/premium/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, roomId }),
      });
      
      if (res.ok) {
        onSuccess?.();
        return;
      }
      
      const data = await res.json().catch(() => ({} as any));
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      
      if (newAttempts >= maxAttempts) {
        setError('Maximum attempts reached. Please contact support.');
      } else {
        setError(data?.error ?? `Invalid PIN. ${maxAttempts - newAttempts} attempts remaining.`);
      }
      setPin('');
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const isMaxAttemptsReached = attempts >= maxAttempts;

  return (
    <PremiumThemeProvider>
      <div className="pr-min-h-[100dvh] pr-flex pr-items-center pr-justify-center pr-p-4 pr-bg-gradient-to-br pr-from-[color-mix(in_oklab,var(--pr-bg),white_2%)] pr-to-[color-mix(in_oklab,var(--pr-bg),black_2%)]">
        <PrCard className="pr-w-full pr-max-w-md pr-overflow-hidden pr-shadow-glow">
          {/* Premium Header */}
          <div className="pr-bg-gradient-to-r pr-from-[var(--pr-primary)] pr-to-[var(--pr-accent)] pr-p-6 pr-text-center">
            <div className="pr-inline-flex pr-items-center pr-gap-2 pr-px-3 pr-py-1 pr-rounded-full pr-bg-white/10 pr-backdrop-blur-sm pr-text-white/90 pr-text-sm pr-font-medium pr-mb-3">
              <span>⭐</span>
              PREMIUM ACCESS
            </div>
            <h1 className="pr-text-2xl pr-font-bold pr-text-white pr-mb-2">
              {roomName}
            </h1>
            <p className="pr-text-white/80 pr-text-sm">
              {description}
            </p>
          </div>

          {/* PIN Form */}
          <div className="pr-p-6">
            <form onSubmit={handleSubmit} className="pr-space-y-4">
              <div>
                <label htmlFor="pin" className="pr-block pr-text-sm pr-font-medium pr-text-[var(--pr-fg)] pr-mb-3">
                  Enter 4-Digit PIN
                </label>
                <input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => handlePinChange(e.target.value)}
                  disabled={loading || isMaxAttemptsReached}
                  maxLength={4}
                  className="pr-w-full pr-rounded-xl pr-border pr-border-[var(--pr-border)] pr-bg-[var(--pr-card)] pr-px-4 pr-py-3 pr-text-center pr-text-2xl pr-font-semibold pr-tracking-widest focus:pr-ring-2 focus:pr-ring-[var(--pr-primary)] focus:pr-border-[var(--pr-primary)] focus:pr-outline-none disabled:pr-opacity-50 pr-transition-colors"
                  required
                />
              </div>

              {error && (
                <div className="pr-p-3 pr-rounded-lg pr-bg-[var(--pr-danger)]/10 pr-border pr-border-[var(--pr-danger)]/20">
                  <p className="pr-text-sm pr-text-[var(--pr-danger)] pr-text-center">{error}</p>
                </div>
              )}

              <PrButton 
                type="submit" 
                disabled={!pin || loading || pin.length !== 4 || isMaxAttemptsReached}
                className="pr-w-full pr-py-3"
              >
                {loading ? (
                  <span className="pr-flex pr-items-center pr-justify-center pr-gap-2">
                    <div className="pr-animate-spin pr-rounded-full pr-h-4 pr-w-4 pr-border-b-2 pr-border-current"></div>
                    Verifying...
                  </span>
                ) : (
                  'Enter Premium Room'
                )}
              </PrButton>
            </form>

            {/* Security Notice */}
            <div className="pr-mt-6 pr-p-4 pr-rounded-lg pr-bg-[color-mix(in_oklab,var(--pr-card),white_4%)] pr-border pr-border-[var(--pr-border)]">
              <div className="pr-flex pr-items-start pr-gap-3">
                <div className="pr-text-[var(--pr-primary)] pr-text-lg">🔒</div>
                <div>
                  <h4 className="pr-text-sm pr-font-medium pr-text-[var(--pr-fg)] pr-mb-1">
                    Secure Premium Access
                  </h4>
                  <p className="pr-text-xs pr-text-[var(--pr-fg)]/70">
                    This content is protected by PIN authentication. Access is logged and will expire after 24 hours for security.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </PrCard>
      </div>
    </PremiumThemeProvider>
  );
}