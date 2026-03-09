'use client';

import { useCallback, useEffect, useState } from 'react';

import type { OnboardingStepPayload, UserOnboarding } from '@/lib/onboarding';

export function useOnboarding() {
  const [state, setState] = useState<UserOnboarding | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/onboarding');
    if (res.ok) setState(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveStep = useCallback(async (payload: OnboardingStepPayload) => {
    setSaving(true);
    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setSaving(false);
      throw new Error('Failed to save onboarding step');
    }

    const next = (await res.json()) as UserOnboarding;
    setState(next);
    setSaving(false);
    return next;
  }, []);

  const finish = useCallback(async () => {
    setSaving(true);
    const res = await fetch('/api/onboarding/complete', { method: 'POST' });
    if (!res.ok) {
      setSaving(false);
      throw new Error('Failed to complete onboarding');
    }
    const next = (await res.json()) as UserOnboarding;
    setState(next);
    setSaving(false);
    return next;
  }, []);

  return { state, loading, saving, saveStep, finish, reload: load };
}
