import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function LegacyOnboardingDate() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/onboarding');
  }, [router]);

  return null;
}
