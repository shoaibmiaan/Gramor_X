'use client';

import React, { useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Badge } from '@/components/design-system/Badge';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import { ProgressBar } from '@/components/design-system/ProgressBar';
import { Input } from '@/components/design-system/Input';
import { Textarea } from '@/components/design-system/Textarea';
import { LayoutHero } from '@/components/layouts/shared/LayoutHero';
import { LayoutSurface } from '@/components/layouts/shared/LayoutSurface';

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

  useEffect(() => {
    if (userRole === undefined || userRole === null) return;
    if (userRole !== 'teacher' && userRole !== 'admin') {
      router.replace('/restricted');
    }
  }, [userRole, router]);

  useEffect(() => {
    if (userRole === 'teacher' && isTeacherApproved) {
      router.replace('/teacher');
    }
  }, [userRole, isTeacherApproved, router]);

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

  if (userRole === undefined || userRole === null) {
    return (
      <div className="grid min-h-[70vh] place-items-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-6 w-6 animate-pulse rounded-full bg-border" />
          <p className="text-mutedText">Checking permissions…</p>
        </div>
      </div>
    );
  }

  if (userRole !== 'teacher' && userRole !== 'admin') return null;

  if (userRole === 'admin') {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-primaryDark/15 via-background to-background text-foreground">
        <LayoutHero
          accent="admin"
          eyebrow="Teacher workspace"
          title="Preview the teacher experience"
          description="You are viewing the teacher console as an admin. Use this mode to review onboarding and class tooling."
          actions={(
            <Button href="/teacher/cohorts" variant="soft" tone="primary" size="lg">
              View cohorts
            </Button>
          )}
          highlight={(
            <>
              <div className="flex items-center gap-2 text-foreground">
                <Badge variant="primary">Admin mode</Badge>
                <span className="text-sm font-medium">Impersonating teacher</span>
              </div>
              <p className="pt-3 text-sm text-mutedText">
                Use this preview to validate resources and classroom flows before enabling new instructors.
              </p>
            </>
          )}
        />

        <LayoutSurface accent="admin">
          <div className="space-y-6 text-base leading-relaxed text-foreground">{children}</div>
        </LayoutSurface>
      </div>
    );
  }

  if (userRole === 'teacher' && isTeacherApproved) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <p className="text-mutedText">Loading your teacher dashboard…</p>
      </div>
    );
  }

  const highlight = (
    <>
      <div className="flex items-center gap-2 text-foreground">
        <Badge variant="warning">Approval pending</Badge>
        <span className="text-sm font-medium">
          {Number.isNaN(progress) ? '0% complete' : `${progress}% complete`}
        </span>
      </div>
      <div className="space-y-3 pt-3 text-foreground">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-mutedText">Documents</span>
          <span className="text-sm font-semibold">
            {teacherProfile?.docsUploaded ? 'Uploaded' : 'Awaiting upload'}
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-mutedText">Training</span>
          <span className="text-sm font-semibold">
            {teacherProfile?.finishedTraining ? 'Complete' : 'Not started'}
          </span>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-primary/12 via-background to-background text-foreground">
      <LayoutHero
        accent="admin"
        eyebrow="Teacher onboarding"
        title="Complete your profile to unlock the teacher workspace"
        description="Share your story, upload documents, and finish the intro training so we can verify your credentials."
        actions={(
          <>
            <Button href="/teacher/register" size="lg">
              Finish profile
            </Button>
            <Button href="/support" variant="soft" tone="primary" size="lg">
              Talk to support
            </Button>
          </>
        )}
        highlight={highlight}
      />

      <LayoutSurface accent="admin">
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground">Welcome, Teacher 👩‍🏫</h1>
            <p className="mt-2 text-mutedText">
              Your account is pending approval. Please complete the steps below to go live.
            </p>
            <div className="mt-3 inline-flex items-center gap-2">
              <Badge variant="warning">Approval Pending</Badge>
              <Badge variant="info">Role: Teacher</Badge>
            </div>
          </div>

          <Alert tone="info">
            <p className="font-medium">Next Step</p>
            <p>Fill your profile and upload required documents for verification.</p>
          </Alert>

          <Card>
            <h2 className="mb-3 text-lg font-semibold">Onboarding Progress</h2>
            <ProgressBar value={Number.isNaN(progress) ? 0 : progress} />
            <p className="mt-2 text-sm text-mutedText">
              {Number.isNaN(progress) ? 0 : progress}% completed
            </p>
          </Card>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <div className="mb-3 flex items-center gap-3">
                <h3 className="font-semibold">Profile Setup</h3>
                <Badge variant={teacherProfile?.fullName && teacherProfile?.subjectExpertise ? 'success' : 'info'}>
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

            <Card>
              <div className="mb-3 flex items-center gap-3">
                <h3 className="font-semibold">Document Verification</h3>
                <Badge variant={teacherProfile?.docsUploaded ? 'success' : 'warning'}>
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

            <Card>
              <div className="mb-3 flex items-center gap-3">
                <h3 className="font-semibold">Training Module</h3>
                <Badge variant={teacherProfile?.finishedTraining ? 'success' : 'info'}>
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

            <Card>
              <div className="mb-3 flex items-center gap-3">
                <h3 className="font-semibold">Classroom Preview</h3>
                <Badge variant="info">Preview</Badge>
              </div>
              <p className="mb-4 text-mutedText">
                See how students experience lessons, assignments, and feedback.
              </p>
              <Button asChild size="sm">
                <Link href="/teacher/demo-class">Preview Class</Link>
              </Button>
            </Card>
          </div>

          <Card className="text-center">
            <h2 className="mb-2 text-lg font-semibold">What happens after submission?</h2>
            <p className="mb-4 text-mutedText">
              Our admin team will verify your profile. Once approved, you’ll get access to student management, lesson publishing,
              and performance analytics.
            </p>
            <Button asChild>
              <Link href="/support">Contact Support</Link>
            </Button>
          </Card>
        </div>
      </LayoutSurface>
    </div>
  );
};

export default TeacherLayout;
