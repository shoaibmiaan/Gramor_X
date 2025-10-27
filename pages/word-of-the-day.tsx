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
      <main className="min-h-[100dvh] bg-gradient-to-br from-lightBg via-white to-electricBlue/10 py-16 sm:py-20">
        <div className="relative">
          <div className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_65%)]" />
          <div className="relative z-10">
            <WordOfTheDayDeepDive />
          </div>
        </div>
      </main>
    </>
  );
};

export default WordOfTheDayPage;
