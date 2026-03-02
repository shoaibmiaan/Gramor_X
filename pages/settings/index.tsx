import type { GetServerSideProps } from 'next';

export default function SettingsHomePage() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: {
    destination: '/settings/profile',
    permanent: false,
  },
});
