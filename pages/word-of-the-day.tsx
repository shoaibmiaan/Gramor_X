import React from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { GetStaticProps } from 'next';
import Script from 'next/script';

// Dynamically import the heavy component with a loading fallback
const WordOfTheDayDeepDive = dynamic(
  () => import('@/components/feature/VocabularySpotlight').then(mod => mod.WordOfTheDayDeepDive),
  {
    loading: () => (
      <div className="flex justify-center items-center min-h-[300px]">
        {/* Escaped apostrophe using HTML entity to avoid lint error */}
        <p className="text-gray-500">Loading today&apos;s word...</p>
      </div>
    ),
    ssr: true,
  }
);

// Define the shape of the word data (adjust according to your API)
interface WordData {
  word: string;
  meaning: string;
  examples: string[];
  partOfSpeech: string;
  date: string;
  // add other fields as needed
}

interface Props {
  wordData: WordData | null;
}

const WordOfTheDayPage: React.FC<Props> = ({ wordData }) => {
  // Fallback title/description if no data
  const pageTitle = wordData
    ? `Word of the Day: ${wordData.word} – GramorX`
    : 'Word Studio | GramorX';

  // Using curly apostrophe in static text is safe (doesn't trigger lint rule)
  const pageDescription = wordData
    ? `Learn "${wordData.word}" (${wordData.partOfSpeech}) – meaning, examples, and streak insights for IELTS.`
    : 'Immerse yourself in today’s IELTS-ready word with meanings, examples, and streak insights.';

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />

        {/* Open Graph / Facebook */}
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content="https://gramorx.com/word-of-the-day" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://gramorx.com/og-image.jpg" /> {/* Update with actual image */}

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content="https://gramorx.com/og-image.jpg" />

        {/* Canonical URL */}
        <link rel="canonical" href="https://gramorx.com/word-of-the-day" />
      </Head>

      {/* Structured Data (JSON‑LD) for the word of the day */}
      {wordData && (
        <Script
          id="structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'CreativeWork',
              name: `Word of the Day: ${wordData.word}`,
              description: pageDescription,
              author: {
                '@type': 'Organization',
                name: 'GramorX',
                url: 'https://gramorx.com',
              },
              datePublished: wordData.date,
              // Add more specific properties if available
            }),
          }}
        />
      )}

      <main className="py-12 sm:py-16 lg:py-20">
        {/* Visually hidden H1 for accessibility and SEO hierarchy */}
        <h1 className="sr-only">Word of the Day</h1>
        <WordOfTheDayDeepDive initialData={wordData} />
      </main>
    </>
  );
};

export const getStaticProps: GetStaticProps<Props> = async () => {
  try {
    // Fetch the word of the day from your API
    const res = await fetch('https://api.gramorx.com/word-of-the-day'); // Replace with your actual endpoint
    if (!res.ok) {
      throw new Error(`Failed to fetch word of the day: ${res.status}`);
    }
    const wordData: WordData = await res.json();

    return {
      props: { wordData },
      revalidate: 86400, // Revalidate once per day (60 * 60 * 24 seconds)
    };
  } catch (error) {
    console.error('Error fetching word of the day:', error);
    // Return 404 page if data cannot be loaded
    return {
      notFound: true,
    };
  }
};

export default WordOfTheDayPage;