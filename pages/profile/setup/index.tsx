// pages/profile/setup/index.tsx
import type { GetServerSideProps, NextPage } from 'next';

const ProfileSetupRedirectPage: NextPage = () => null;

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/profile',
      permanent: false,
    },
  };
};

export default ProfileSetupRedirectPage;
