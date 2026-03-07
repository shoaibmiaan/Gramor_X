// pages/settings/security.tsx
import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import { Badge } from '@/components/design-system/Badge';
import { Skeleton } from '@/components/design-system/Skeleton';
import { useToast } from '@/components/design-system/Toaster';
import { useLocale } from '@/lib/locale';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';

interface SessionInfo {
  id: string;
  user_agent: string | null;
  created_at: string;
  ip: string | null;
  is_current?: boolean;
}

interface LoginEvent {
  id: number;
  created_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

export default function SecuritySettings() {
  const router = useRouter();
  const { t } = useLocale();
  const { success: toastSuccess, error: toastError } = useToast();

  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [logins, setLogins] = useState<LoginEvent[]>([]);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [mfaLoading, setMfaLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sessionsRes, loginsRes, mfaRes] = await Promise.all([
        fetch('/api/auth/sessions').then((r) => r.json()),
        fetch('/api/auth/login-events').then((r) => r.json()),
        supabase.auth.mfa.listFactors(),
      ]);

      if (Array.isArray(sessionsRes)) setSessions(sessionsRes);
      if (Array.isArray(loginsRes)) setLogins(loginsRes.slice(0, 10)); // last 10
      if (mfaRes.data?.factors?.length) setMfaEnabled(true);
    } catch (err) {
      setError(t('security.error.load', 'Failed to load security data.'));
      toastError(t('security.error.load', 'Failed to load security data.'));
    } finally {
      setLoading(false);
    }
  }, [t, toastError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const revokeSession = async (id: string) => {
    setRevokingId(id);
    try {
      const res = await fetch(`/api/auth/sessions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setSessions((prev) => prev.filter((s) => s.id !== id));
      toastSuccess(t('security.sessionRevoked', 'Session revoked successfully.'));
    } catch (err) {
      toastError(t('security.error.revoke', 'Failed to revoke session.'));
    } finally {
      setRevokingId(null);
    }
  };

  const enableMfa = async () => {
    setMfaLoading(true);
    try {
      // This would typically start a multi-step flow; for demo we simulate
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (error) throw error;
      // In a real app, you'd show QR code and ask for verification
      toastSuccess(t('security.mfaEnabled', 'MFA enabled successfully.'));
      setMfaEnabled(true);
    } catch (err) {
      toastError(t('security.error.mfa', 'Failed to enable MFA.'));
    } finally {
      setMfaLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>{t('security.pageTitle', 'Security · Settings · GramorX')}</title>
        </Head>
        <div className="py-6">
          <Container>
            <Skeleton className="h-8 w-48 rounded-ds-xl mb-4" />
            <Card className="p-6 rounded-ds-2xl space-y-4">
              <Skeleton className="h-12 w-full rounded-ds" />
              <Skeleton className="h-12 w-full rounded-ds" />
              <Skeleton className="h-12 w-full rounded-ds" />
            </Card>
          </Container>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{t('security.pageTitle', 'Security · Settings · GramorX')}</title>
        <meta
          name="description"
          content={t(
            'security.pageDescription',
            'Manage your security settings, sessions, and multi-factor authentication.'
          )}
        />
      </Head>

      <div className="py-6">
        <Container>
          <header className="mb-4">
            <h1 className="text-h2 font-bold text-foreground">
              {t('security.title', 'Security')}
            </h1>
            <p className="text-small text-muted-foreground">
              {t(
                'security.subtitle',
                'Review and manage your account security settings.'
              )}
            </p>
          </header>

          {error && (
            <Alert variant="error" className="mb-4" role="alert">
              {error}
            </Alert>
          )}

          <div className="space-y-6">
            {/* Multi-Factor Authentication */}
            <Card className="rounded-ds-2xl p-6">
              <h2 className="text-h4 font-semibold mb-2">
                {t('security.mfa.title', 'Multi-factor authentication')}
              </h2>
              <p className="text-small text-muted-foreground mb-4">
                {t(
                  'security.mfa.description',
                  'Add an extra layer of security to your account.'
                )}
              </p>
              {mfaEnabled ? (
                <div className="flex items-center gap-2">
                  <Badge variant="success">{t('security.mfa.enabled', 'Enabled')}</Badge>
                  <Button variant="outline" size="sm" disabled>
                    {t('security.mfa.manage', 'Manage')} ({t('common.comingSoon', 'coming soon')})
                  </Button>
                </div>
              ) : (
                <Button
                  variant="primary"
                  onClick={enableMfa}
                  loading={mfaLoading}
                  disabled={mfaLoading}
                >
                  {t('security.mfa.enable', 'Enable MFA')}
                </Button>
              )}
            </Card>

            {/* Active Sessions */}
            <Card className="rounded-ds-2xl p-6">
              <h2 className="text-h4 font-semibold mb-2">
                {t('security.sessions.title', 'Active sessions')}
              </h2>
              <p className="text-small text-muted-foreground mb-4">
                {t(
                  'security.sessions.description',
                  'These devices are currently logged into your account.'
                )}
              </p>
              {sessions.length === 0 ? (
                <p className="text-small text-muted-foreground">
                  {t('security.sessions.none', 'No other active sessions.')}
                </p>
              ) : (
                <ul className="space-y-3">
                  {sessions.map((s) => (
                    <li
                      key={s.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-ds border border-border bg-muted/30"
                    >
                      <div className="space-y-1 mb-2 sm:mb-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {s.user_agent || t('security.sessions.unknown', 'Unknown device')}
                          </span>
                          {s.is_current && (
                            <Badge size="sm" variant="info">
                              {t('security.sessions.current', 'Current')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-caption text-muted-foreground">
                          {s.ip && `${s.ip} · `}
                          {formatDate(s.created_at)}
                        </p>
                      </div>
                      {!s.is_current && (
                        <Button
                          size="sm"
                          variant="outline"
                          tone="danger"
                          onClick={() => revokeSession(s.id)}
                          loading={revokingId === s.id}
                          disabled={revokingId === s.id}
                        >
                          {t('security.sessions.revoke', 'Revoke')}
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Login History */}
            <Card className="rounded-ds-2xl p-6">
              <h2 className="text-h4 font-semibold mb-2">
                {t('security.history.title', 'Recent login history')}
              </h2>
              <p className="text-small text-muted-foreground mb-4">
                {t(
                  'security.history.description',
                  'Last 10 login attempts to your account.'
                )}
              </p>
              {logins.length === 0 ? (
                <p className="text-small text-muted-foreground">
                  {t('security.history.none', 'No login history found.')}
                </p>
              ) : (
                <ul className="space-y-2">
                  {logins.map((l) => (
                    <li
                      key={l.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-2 text-small"
                    >
                      <span className="font-mono text-xs">
                        {formatDate(l.created_at)}
                      </span>
                      <span className="text-muted-foreground">
                        {l.ip_address || t('security.history.unknownIP', 'Unknown IP')}
                      </span>
                      <span className="text-muted-foreground truncate max-w-xs">
                        {l.user_agent || t('security.history.unknownDevice', 'Unknown device')}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Change Password Link */}
            <Card className="rounded-ds-2xl p-6">
              <h2 className="text-h4 font-semibold mb-2">
                {t('security.password.title', 'Password')}
              </h2>
              <p className="text-small text-muted-foreground mb-4">
                {t(
                  'security.password.description',
                  'Change your password or reset it if you forgot.'
                )}
              </p>
              <Button asChild variant="outline">
                <Link href="/account/security/change-password">
                  {t('security.password.change', 'Change password')}
                </Link>
              </Button>
            </Card>
          </div>
        </Container>
      </div>
    </>
  );
}