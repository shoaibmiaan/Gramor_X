// pages/_document.tsx
import { Html, Head, Main, NextScript } from 'next/document';
import { HEX, WHITE } from '@/lib/tokens';

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'GramorX',
  url: 'https://gramorx.com',
  logo: '/brand/logo.png',
} as const;

const orgJsonLdJson = JSON.stringify(orgJsonLd);

const localeBootstrapScript = `(() => {
  try {
    const match = document.cookie.match(/(?:^|;)\\s*locale=([^;]+)/);
    const locale = match ? decodeURIComponent(match[1]) : 'en';
    const isRTL = /^(ur|ar|fa|he)(-|$)/i.test(locale);
    const root = document.documentElement;
    root.setAttribute('lang', locale || 'en');
    root.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
  } catch (error) {
    console.warn('locale bootstrap failed', error);
  }
})();`;

export default function Document() {

  return (
    <Html lang="en" dir="ltr" className="bg-background text-foreground" suppressHydrationWarning>
      <Head>
        {/* Base SEO */}
        <meta
          name="description"
          content="GramorX is an AI-powered platform for personalized IELTS preparation across Listening, Reading, Writing, and Speaking."
        />
        <meta
          name="keywords"
          content="IELTS, exam prep, English learning, AI, listening, reading, writing, speaking"
        />

        {/* Color scheme & theme */}
        <meta name="color-scheme" content="dark light" />
        <meta key="theme-dark" name="theme-color" content={HEX.ink} media="(prefers-color-scheme: dark)" />
        <meta key="theme-light" name="theme-color" content={WHITE} media="(prefers-color-scheme: light)" />

        {/* Open Graph / Twitter */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="GramorX – AI IELTS Prep" />
        <meta
          property="og:description"
          content="Achieve your IELTS goals with adaptive practice and real-time feedback."
        />
        <meta property="og:url" content="https://gramorx.com" />
        <meta property="og:image" content="/brand/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />

        {/* Preconnects */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* PWA + Icons */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.svg" />

        {/* JSON-LD */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: orgJsonLdJson }} />

        {/* Pre-paint locale->dir fixer */}
        <script dangerouslySetInnerHTML={{ __html: localeBootstrapScript }} />
      </Head>
      <body className="bg-background text-foreground antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
