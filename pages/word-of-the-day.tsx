import React from 'react';
import Head from 'next/head';
import { WordOfTheDayDeepDive } from '@/components/feature/VocabularySpotlight';

const WordOfTheDayPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>Word Studio | GramorX</title>
        <meta
          name="description"
          content="Immerse yourself in today&apos;s IELTS-ready word with meanings, examples, and streak insights."
        />
      </Head>
      <main className="py-12 sm:py-16 lg:py-20">
        <WordOfTheDayDeepDive />
      </main>
    </>
  );
};

export default WordOfTheDayPage;
