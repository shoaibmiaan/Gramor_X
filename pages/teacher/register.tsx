// pages/teacher/register.tsx
import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Container } from '@/components/design-system/Container';
import { useTeacherProfile } from '@/hooks/useTeacherProfile';
import TeacherOnboardingForm from '@/components/teacher/TeacherOnboardingForm';

const SUBJECTS = [
  'IELTS Listening',
  'IELTS Reading',
  'IELTS Writing',
  'IELTS Speaking',
  'Grammar',
  'Vocabulary',
];

export default function TeacherRegisterPage() {
  const router = useRouter();
  const { profile, isLoading } = useTeacherProfile();

  React.useEffect(() => {
    if (isLoading) return;
    if (profile?.teacher_onboarding_completed) {
      router.replace('/teacher'); // go to pending or dashboard screen
    }
  }, [isLoading, profile, router]);

  return (
    <>
      <Head><title>Teacher Registration</title></Head>
      <Container className="py-8 space-y-6">
        <h1 className="text-2xl font-semibold">Apply as a Teacher</h1>
        <TeacherOnboardingForm subjectsOptions={SUBJECTS} />
      </Container>
    </>
  );
}