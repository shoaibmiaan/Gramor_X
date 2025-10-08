import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function LegacyOnboardingGoal() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/onboarding');
  }, [router]);

  return null;
}
