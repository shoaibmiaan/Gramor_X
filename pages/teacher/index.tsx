import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Container } from '@/components/design-system/Container';
import { useTeacherProfile } from '@/hooks/useTeacherProfile';
import { RegistrationComplete } from '@/components/teacher/RegistrationComplete';

export default function TeacherIndex() {
  const router = useRouter();
  const { profile, isLoading } = useTeacherProfile();

  React.useEffect(() => {
    if (isLoading) return;
    if (!profile || !profile.teacher_onboarding_completed) {
      router.replace('/teacher/register');
    }
  }, [isLoading, profile, router]);

  const showPending =
    !!profile &&
    profile.teacher_onboarding_completed &&
    !profile.teacher_approved;

  return (
    <>
      <Head><title>Teacher</title></Head>
      <Container className="py-8">
        {isLoading ? (
          <div className="text-sm">Loading…</div>
        ) : showPending ? (
          <RegistrationComplete />
        ) : null}
      </Container>
    </>
  );
}
