import type { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/study-plan',
      permanent: false,
    },
  };
};

export default function QuickRedirectPage() {
  return null;
}
