import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { findProfileByAuthId } from '@/lib/auth/profileLookup';

export async function resolvePostLoginRoute(): Promise<'/dashboard' | '/onboarding'> {
  const {
    data: { user },
    error: userError,
  } = await supabaseBrowser.auth.getUser();

  if (userError || !user) {
    return '/onboarding';
  }

  const { profile } = await findProfileByAuthId(supabaseBrowser, user.id, 'id', {
    allowLegacyUserIdFallback: true,
  });

  return profile ? '/dashboard' : '/onboarding';
}
