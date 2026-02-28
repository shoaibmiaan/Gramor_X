import type { Profile } from '@/types/profile';

export type BillingSummary = {
  plan: string;
  status: 'active' | 'trialing' | 'canceled' | 'incomplete' | 'past_due' | 'unpaid' | 'paused';
  renewsAt?: string;
  trialEndsAt?: string;
};

export type BillingSummaryResponse =
  | {
      ok: true;
      summary: BillingSummary;
      customerId?: string | null;
      needsStripeSetup?: boolean;
    }
  | { ok: false; error: string };

export async function fetchBillingSummary(): Promise<BillingSummaryResponse> {
  const response = await fetch('/api/billing/summary', { credentials: 'include' });
  const payload = (await response.json()) as BillingSummaryResponse;
  if (!response.ok) {
    throw new Error('Failed to load billing summary');
  }
  return payload;
}

export async function fetchProfileDashboardData() {
  const response = await fetch('/api/profile/dashboard', { credentials: 'include' });
  if (!response.ok) throw new Error('Failed to load profile dashboard');
  return (await response.json()) as {
    profile: Profile | null;
    estimatedBand: number | null;
    trend: Array<{ label: string; band: number }>;
    weaknessHeatmap: Array<{ skill: string; value: number }>;
    aiFeedbackHistory: Array<{ id: string; message: string; createdAt: string }>;
    nextTasks: Array<{ id: string; title: string; reason: string }>;
    tokenUsage: { used: number; total: number };
  };
}

export async function fetchSecurityCenter() {
  const [sessionsRes, historyRes] = await Promise.all([
    fetch('/api/auth/sessions', { credentials: 'include' }),
    fetch('/api/auth/login-events', { credentials: 'include' }),
  ]);

  return {
    sessions: sessionsRes.ok ? ((await sessionsRes.json()) as Array<Record<string, unknown>>) : [],
    history: historyRes.ok ? ((await historyRes.json()) as Array<Record<string, unknown>>) : [],
  };
}
