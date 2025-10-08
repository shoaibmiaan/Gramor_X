import * as React from 'react';
import { useRouter } from 'next/router';

export default function LegacyScheduleRedirect() {
  const router = useRouter();

  React.useEffect(() => {
    void router.replace('/onboarding/whatsapp');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <p className="text-small text-mutedText">Redirecting to the new onboarding flow…</p>
    </div>
  );
}
