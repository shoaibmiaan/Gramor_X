import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function LegacyOnboardingSkills() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/onboarding');
  }, [router]);

  return null;
}
