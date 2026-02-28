import { useCallback, useState } from 'react';
import useSWR from 'swr';

import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { fetchSecurityCenter } from '@/services/accountService';

type MfaState = {
  enabled: boolean;
  otpSent: boolean;
  factorId: string | null;
};

export function useAccountSecurity() {
  const { data, error, mutate, isLoading } = useSWR('account-security', fetchSecurityCenter, {
    revalidateOnFocus: false,
  });

  const [mfa, setMfa] = useState<MfaState>({ enabled: false, otpSent: false, factorId: null });

  const refresh = useCallback(async () => {
    await mutate();
  }, [mutate]);

  const revokeSession = useCallback(
    async (id: string) => {
      const response = await fetch(`/api/auth/sessions/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to revoke session');
      }

      await refresh();
    },
    [refresh],
  );

  const enableMfa = useCallback(async () => {
    const supabase = supabaseBrowser();
    const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    if (enrollError) {
      throw new Error(enrollError.message);
    }

    const { error: challengeError } = await supabase.auth.mfa.challenge({ factorId: enrollData.id });
    if (challengeError) {
      throw new Error(challengeError.message);
    }

    setMfa({ enabled: false, otpSent: true, factorId: enrollData.id });
  }, []);

  const verifyMfa = useCallback(async (code: string) => {
    const supabase = supabaseBrowser();
    const factorId = mfa.factorId;
    if (!factorId) {
      throw new Error('MFA enrollment not found');
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, code });
    if (verifyError) {
      throw new Error(verifyError.message);
    }

    setMfa({ enabled: true, otpSent: false, factorId: null });
  }, [mfa.factorId]);

  return {
    sessions: (data?.sessions ?? []) as Array<Record<string, unknown>>,
    history: (data?.history ?? []) as Array<Record<string, unknown>>,
    isLoading,
    error,
    refresh,
    revokeSession,
    mfaEnabled: mfa.enabled,
    otpSent: mfa.otpSent,
    enableMfa,
    verifyMfa,
  };
}

export default useAccountSecurity;
