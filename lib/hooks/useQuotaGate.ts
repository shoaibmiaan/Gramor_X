// hooks/useQuotaGuard.ts
import { useRouter } from 'next/router';
import { useCallback } from 'react';
import { toast } from '@/components/design-system/Toaster';
import type { GXErrorPayload } from '@/types/usage';

export function useQuotaGuard() {
  const router = useRouter();

  const handleResponse = useCallback(async (res: Response, context?: { module?: string }) => {
    if (res.ok) return res;

    let payload: GXErrorPayload | null = null;
    try {
      payload = (await res.json()) as GXErrorPayload;
    } catch {
      payload = null;
    }

    const code = payload?.error?.code || res.headers.get('X-GX-Error-Code') || '';
    const message = payload?.error?.message || 'Action unavailable.';
    const meta = payload?.error?.meta ?? {};

    if (res.status === 402 && code === 'QUOTA_EXCEEDED') {
      const module = String(meta.module || context?.module || 'writing');
      const remaining = Number(meta.remaining ?? 0);
      const resetAtValue = typeof meta.resetAt === 'string' ? meta.resetAt : null;
      const resetAt = resetAtValue ? new Date(resetAtValue) : null;

      toast.error(`No ${module} attempts left on your plan.`, {
        description: resetAt
          ? `Quota resets ${resetAt.toLocaleDateString()} ${resetAt.toLocaleTimeString()}.`
          : 'Upgrade to continue immediately.',
        duration: 5000,
      });

      const params = new URLSearchParams({
        reason: 'quota_exhausted',
        module,
        remaining: String(remaining),
        ...(resetAt ? { resetAt: resetAt.toISOString() } : {}),
        from: router.asPath,
      }).toString();

      setTimeout(() => {
        router.push(`/pricing?${params}`);
      }, 300);
      throw new Error(message);
    }

    toast.error('Request failed', { description: message });
    throw new Error(message);
  }, [router]);

  return { handleResponse };
}
