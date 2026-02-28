import type { GetServerSideProps } from 'next';
import React, { useState } from 'react';

import { Alert } from '@/components/design-system/Alert';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Input } from '@/components/design-system/Input';
import SettingsLayout from '@/components/layouts/SettingsLayout';
import { useAccountSecurity } from '@/hooks/useAccountSecurity';
import { requireAuthenticatedPage } from '@/lib/ssr/requireAuthenticatedPage';

export default function SecuritySettings() {
  const {
    sessions,
    history,
    isLoading,
    refresh,
    revokeSession,
    mfaEnabled,
    otpSent,
    enableMfa,
    verifyMfa,
  } = useAccountSecurity();

  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busySessionId, setBusySessionId] = useState<string | null>(null);

  const handleEnableMfa = async () => {
    setError(null);
    try {
      await enableMfa();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to enable MFA');
    }
  };

  const handleVerifyMfa = async () => {
    setError(null);
    try {
      await verifyMfa(otp);
      setOtp('');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to verify MFA');
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    setError(null);
    setBusySessionId(sessionId);
    try {
      await revokeSession(sessionId);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to revoke session');
    } finally {
      setBusySessionId(null);
    }
  };

  const handleRefresh = async () => {
    setError(null);
    try {
      await refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to refresh security data');
    }
  };

  return (
    <SettingsLayout title="Security" description="Manage MFA, active sessions, and device login history.">
      <div className="space-y-4">
        {error ? <Alert variant="danger">{error}</Alert> : null}

        <Card className="space-y-3 p-5">
          <h2 className="text-body font-semibold">Multi-Factor Authentication</h2>
          {mfaEnabled ? (
            <Alert variant="success">2FA is enabled for your account.</Alert>
          ) : otpSent ? (
            <div className="flex max-w-xs items-end gap-2">
              <Input
                label="Authenticator code"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
              />
              <Button onClick={handleVerifyMfa}>Verify</Button>
            </div>
          ) : (
            <Button onClick={handleEnableMfa}>Enable 2FA</Button>
          )}
        </Card>

        <Card className="space-y-3 p-5">
          <h2 className="text-body font-semibold">Active Sessions</h2>
          {isLoading ? (
            <p className="text-small text-muted-foreground">Loading sessions…</p>
          ) : sessions.length === 0 ? (
            <p className="text-small text-muted-foreground">No additional sessions found.</p>
          ) : (
            <ul className="space-y-2">
              {sessions.map((session) => {
                const id = String(session.id);
                const isBusy = busySessionId === id;
                return (
                  <li key={id} className="flex items-center justify-between rounded-md border border-border/60 p-3">
                    <span className="text-small text-muted-foreground">
                      {String(session.user_agent ?? 'Unknown device')}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={isBusy}
                      onClick={() => void handleRevokeSession(id)}
                    >
                      {isBusy ? 'Revoking…' : 'Revoke'}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="space-y-3 p-5">
          <h2 className="text-body font-semibold">Device Login History</h2>
          {history.length === 0 ? (
            <p className="text-small text-muted-foreground">No login history available.</p>
          ) : (
            <ul className="space-y-2 text-small">
              {history.slice(0, 20).map((event, index) => (
                <li key={`${String(event.id ?? index)}`} className="rounded-md border border-border/60 p-3">
                  {new Date(String(event.created_at)).toLocaleString()} ·{' '}
                  {String(event.ip_address ?? 'Unknown IP')}
                </li>
              ))}
            </ul>
          )}
          <div className="pt-2">
            <Button variant="ghost" size="sm" onClick={() => void handleRefresh()}>
              Refresh history
            </Button>
          </div>
        </Card>

        <Card className="space-y-2 p-5">
          <h2 className="text-body font-semibold">Password changes</h2>
          <p className="text-small text-muted-foreground">
            Password updates require a valid recovery/re-authentication flow.
          </p>
          <Button href="/update-password" variant="outline" size="sm">
            Change password securely
          </Button>
        </Card>
      </div>
    </SettingsLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) =>
  requireAuthenticatedPage(ctx, {});
