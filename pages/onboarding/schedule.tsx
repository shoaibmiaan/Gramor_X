import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function LegacyOnboardingSchedule() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/onboarding');
  }, [router]);

  return null;
}
