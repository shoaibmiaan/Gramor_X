import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function OnboardingTeacherPage() {
  const router = useRouter();

  useEffect(() => {
    void router.replace('/teacher/register');
  }, [router]);

  return null;
}
