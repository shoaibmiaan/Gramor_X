// components/layouts/TeacherLayout.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

// DS components only (no icons to avoid undefined imports)
import { Container } from '@/components/design-system/Container';
import { Section } from '@/components/design-system/Section';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Alert } from '@/components/design-system/Alert';
import { ProgressBar } from '@/components/design-system/ProgressBar';
import { Input } from '@/components/design-system/Input';
import { Textarea } from '@/components/design-system/Textarea';
import Link from 'next/link';
import { TeacherSkeleton } from '@/components/common/Skeleton';

type TeacherLayoutProps = {
  children: React.ReactNode;
  userRole?: string | null;
  isTeacherApproved?: boolean | null;
  teacherProfile?: {
    fullName?: string | null;
    subjectExpertise?: string | null;
    experience?: string | null;
    docsUploaded?: boolean | null;
    finishedTraining?: boolean | null;
  } | null;
};

const TeacherLayout: React.FC<TeacherLayoutProps> = ({
  children,
  userRole,
  isTeacherApproved,
  teacherProfile,
}) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  // Simulate loading state for profile data
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1200); // Simulate API call

    return () => clearTimeout(timer);
  }, []);

  // Guard non-teachers (except admins). Avoids first-frame flash.
  useEffect(() => {
    if (userRole === undefined || userRole === null) return;
    if (userRole !== 'teacher' && userRole !== 'admin') {
      router.replace('/restricted');
    }
  }, [userRole, router]);

  // Show skeleton while loading or checking role
  if (isLoading || userRole === undefined || userRole === null) {
    return <TeacherSkeleton />;
  }

  // Safety: if non-teacher slipped through, render nothing (effect above will redirect)
  if (userRole !== 'teacher' && userRole !== 'admin') return null;

  // Admins: show children (not teacher onboarding)
  if (userRole === 'admin') return <div className="p-6">{children}</div>;

  // Approved teachers → redirect to the Teacher dashboard route (avoid importing the page component)
  useEffect(() => {
    if (userRole === 'teacher' && isTeacherApproved) {
      router.replace('/teacher'); // safe redirect
    }
  }, [userRole, isTeacherApproved, router]);

  if (userRole === 'teacher' && isTeacherApproved) {
    // Short neutral screen during redirect
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <p className="text-mutedText">Loading your teacher dashboard…</p>
      </div>
    );
  }

  // Unapproved teacher → DS-compliant welcome & onboarding
  const progress = useMemo(() => {
    let done = 0;
    const total = 5;
    if (teacherProfile?.fullName) done += 1;
    if (teacherProfile?.subjectExpertise) done += 1;
    if (teacherProfile?.experience) done += 1;
    if (teacherProfile?.docsUploaded) done += 1;
    if (teacherProfile?.finishedTraining) done += 1;
    return Math.round((done / total) * 100);
  }, [teacherProfile]);

  return (
    <Container>
      <Section>
        <div className="mx-auto mb-6 max-w-2xl text-center">
          <h1 className="text-3xl font-bold text-foreground">Welcome, Teacher 👩‍🏫</h1>
          <p className="mt-2 text-mutedText">
            Your account is pending approval. Please complete the steps below.
          </p>
          <div className="mt-3 inline-flex items-center gap-2">
            <Badge tone="warning">Approval Pending</Badge>
            <Badge tone="info">Role: Teacher</Badge>
          </div>
        </div>

        <Alert tone="info" className="mb-6">
          <p className="font-medium">Next Step</p>
          <p>Fill your profile and upload required documents for verification.</p>
        </Alert>

        <Card className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Onboarding Progress</h2>
          <ProgressBar value={Number.isNaN(progress) ? 0 : progress} />
          <p className="mt-2 text-sm text-mutedText">
            {Number.isNaN(progress) ? 0 : progress}% completed
          </p>
        </Card>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Profile Setup */}
          <Card>
            <div className="mb-3 flex items-center gap-3">
              <h3 className="font-semibold">Profile Setup</h3>
              <Badge tone={teacherProfile?.fullName && teacherProfile?.subjectExpertise ? 'success' : 'info'}>
                {teacherProfile?.fullName && teacherProfile?.subjectExpertise ? 'Done' : 'Start'}
              </Badge>
            </div>

            <p className="mb-4 text-mutedText">
              Add your full name, subject expertise, and summary of teaching experience.
            </p>

            <form
              className="grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                // TODO: wire to your Supabase update
              }}
              aria-label="Teacher profile form"
            >
              <div className="grid gap-1.5">
                <label htmlFor="full-name" className="text-sm text-mutedText">
                  Full Name
                </label>
                <Input id="full-name" name="fullName" placeholder="Your full name" required />
              </div>

              <div className="grid gap-1.5">
                <label htmlFor="subject-expertise" className="text-sm text-mutedText">
                  Subject Expertise
                </label>
                <Input id="subject-expertise" name="subjectExpertise" placeholder="e.g., IELTS Writing" required />
              </div>

              <div className="grid gap-1.5">
                <label htmlFor="experience" className="text-sm text-mutedText">
                  Experience
                </label>
                <Textarea
                  id="experience"
                  name="experience"
                  placeholder="Years of teaching experience and highlights"
                  rows={3}
                  required
                />
              </div>

              <Button type="submit" tone="success" className="mt-2">
                Save Profile
              </Button>
            </form>
          </Card>

          {/* Document Verification */}
          <Card>
            <div className="mb-3 flex items-center gap-3">
              <h3 className="font-semibold">Document Verification</h3>
              <Badge tone={teacherProfile?.docsUploaded ? 'success' : 'warning'}>
                {teacherProfile?.docsUploaded ? 'Uploaded' : 'Pending'}
              </Badge>
            </div>
            <p className="mb-4 text-mutedText">
              Upload your ID and qualification certificates for admin review.
            </p>
            <Button asChild tone="info" size="sm">
              <Link href="/teacher/upload-docs">Upload Documents</Link>
            </Button>
          </Card>

          {/* Training */}
          <Card>
            <div className="mb-3 flex items-center gap-3">
              <h3 className="font-semibold">Training Module</h3>
              <Badge tone={teacherProfile?.finishedTraining ? 'success' : 'info'}>
                {teacherProfile?.finishedTraining ? 'Completed' : 'Not Started'}
              </Badge>
            </div>
            <p className="mb-4 text-mutedText">
              Complete a short orientation on platform tools and classroom best practices.
            </p>
            <Button asChild size="sm">
              <Link href="/teacher/training">Start Training</Link>
            </Button>
          </Card>

          {/* Classroom Preview */}
          <Card>
            <div className="mb-3 flex items-center gap-3">
              <h3 className="font-semibold">Classroom Preview</h3>
              <Badge tone="info">Preview</Badge>
            </div>
            <p className="mb-4 text-mutedText">
              See how students experience lessons, assignments, and feedback.
            </p>
            <Button asChild size="sm">
              <Link href="/teacher/demo-class">Preview Class</Link>
            </Button>
          </Card>
        </div>

        <Card className="mt-8 text-center">
          <h2 className="mb-2 text-lg font-semibold">What happens after submission?</h2>
          <p className="mb-4 text-mutedText">
            Our admin team will verify your profile. Once approved, you'll get access to student
            management, lesson publishing, and performance analytics.
          </p>
          <Button asChild>
            <Link href="/support">Contact Support</Link>
          </Button>
        </Card>
      </Section>
    </Container>
  );
};

export default TeacherLayout;