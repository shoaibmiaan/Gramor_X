// pages/admin/teacher/index.tsx
// If someone/anything navigates to singular /admin/teacher,
// immediately redirect to the canonical /admin/teachers.

import type { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: { destination: '/admin/teachers', permanent: false },
  };
};

export default function AdminTeacherRedirect() {
  return null;
}
