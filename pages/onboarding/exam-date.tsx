import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function LegacyExamDateRedirect() {
  const router = useRouter();
  useEffect(() => { void router.replace('/onboarding/exam-timeline'); }, [router]);
  return null;
}
