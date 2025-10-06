// pages/onboarding/teacher/index.tsx (replace current content)
import React from 'react';
import TeacherLayout from '@/components/layouts/TeacherLayout';
import type { GetServerSideProps } from 'next';
import { supabaseServer } from '@/lib/supabaseServer';

type Props = React.ComponentProps<typeof TeacherLayout>;

export const getServerSideProps: GetServerSideProps<Props> = async ({ req, res }) => {
  const { supabase, user } = await supabaseServer(req, res);
  if (!user) return { redirect: { destination: '/login', permanent: false } };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_teacher_approved, full_name, teacher_subject_expertise, teacher_experience, teacher_docs_uploaded, teacher_training_done')
    .eq('id', user.id)
    .single();

  const userRole = (profile?.role ?? null) as Props['userRole'];
  const isTeacherApproved = !!profile?.is_teacher_approved;

  const teacherProfile =
    userRole === 'teacher'
      ? {
          fullName: profile?.full_name ?? null,
          subjectExpertise: profile?.teacher_subject_expertise ?? null,
          experience: profile?.teacher_experience ?? null,
          docsUploaded: !!profile?.teacher_docs_uploaded,
          finishedTraining: !!profile?.teacher_training_done,
        }
      : null;

  return { props: { userRole, isTeacherApproved, teacherProfile, children: null } };
};

export default function TeacherOnboardingPage(props: Props) {
  return <TeacherLayout {...props} />;
}
