// pages/profile/account/referrals.tsx
import type { GetServerSideProps, NextPage } from 'next';

const ProfileAccountReferralsPage: NextPage = () => null;

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/profile/account/referrals',
      permanent: false,
    },
  };
};

export default ProfileAccountReferralsPage;
