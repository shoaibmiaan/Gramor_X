import * as React from 'react';
import Link from 'next/link';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Alert } from '@/components/design-system/Alert';
import OnboardingProgress from '@/components/teacher/OnboardingProgress';

export default function TeacherPending() {
  return (
    <Container className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Application Received ✅</h1>
        <p className="text-mutedText">We’re verifying your details. You’ll get an email when approved.</p>
      </div>

      <OnboardingProgress percentKey="teacher.onboarding.percent" />

      <Card className="space-y-3 text-center">
        <p className="text-sm text-mutedText">
          Tip: Keep your profile complete for faster approval. You can still edit your details.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/teacher/onboarding" className="btn">Edit Details</Link>
          <Link href="/account" className="btn">Go to Account</Link>
        </div>
      </Card>

      <Alert variant="info">Need help? Contact support and mention your registered email.</Alert>
    </Container>
  );
}
