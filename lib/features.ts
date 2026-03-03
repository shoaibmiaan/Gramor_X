import { serverEnabled, type FlagAudience } from '@/lib/flags';
import type { FeatureFlagKey } from '@/lib/config/featureFlags';

export async function isFeatureEnabled(
  userId: string | null,
  featureName: FeatureFlagKey,
  audience?: Omit<FlagAudience, 'userId'>,
): Promise<boolean> {
  return serverEnabled(featureName, {
    userId: userId ?? undefined,
    plan: audience?.plan,
    role: audience?.role,
  });
}

export async function requireFeature(
  userId: string | null,
  featureName: FeatureFlagKey,
  audience?: Omit<FlagAudience, 'userId'>,
): Promise<void> {
  const enabled = await isFeatureEnabled(userId, featureName, audience);
  if (!enabled) {
    const err = new Error('feature_disabled');
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
}
