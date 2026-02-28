// pages/profile/setup/index.tsx
import type { GetServerSideProps, NextPage } from 'next';
import { requireAuthenticatedPage } from '@/lib/ssr/requireAuthenticatedPage';

const ProfileSetupRedirectPage: NextPage = () => null;

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const auth = await requireAuthenticatedPage(ctx, {});
  if ('redirect' in auth) return auth;

  return {
    redirect: {
      destination: '/profile',
      permanent: false,
    },
  };
};

export default ProfileSetupRedirectPage;
