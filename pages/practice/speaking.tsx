import type { GetServerSideProps } from 'next';

import { SpeakingPracticeHub } from '@/components/speaking/SpeakingPracticeHub';
import { getSpeakingHubServerProps } from '@/lib/speaking/getSpeakingHubProps';
import type { SpeakingPracticeHubProps } from '@/types/speakingPracticeHub';

export default function PracticeSpeakingPage(props: SpeakingPracticeHubProps) {
  return <SpeakingPracticeHub {...props} />;
}

export const getServerSideProps: GetServerSideProps<SpeakingPracticeHubProps> = async ({ req, res }) => {
  const props = await getSpeakingHubServerProps(req, res);
  return { props };
};
