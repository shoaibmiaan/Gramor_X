// pages/_document.tsx
import Document, {
  Html,
  Head,
  Main,
  NextScript,
  type DocumentContext,
  type DocumentProps,
} from 'next/document';
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
    const cookieMatch = document.cookie.match(/(?:^|;)\\s*locale=([^;]+)/);
    const stored = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
    const locale = stored || 'en';
    const isRTL = /^ur(?:-|$)/i.test(locale);
    const root = document.documentElement;
    root.setAttribute('lang', locale || 'en');
    root.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
  } catch (error) {
    console.warn('locale bootstrap failed', error);
  }
})();`;

type LocaleAttrs = { lang: string; dir: 'ltr' | 'rtl' };

function parseLocale(req?: DocumentContext['req']): LocaleAttrs {
  const cookies = req?.headers?.cookie ?? '';
  const match = cookies.match(/(?:^|;)\\s*locale=([^;]+)/);
  const raw = match ? decodeURIComponent(match[1]) : 'en';
  const lang = raw.toLowerCase().startsWith('ur') ? 'ur' : 'en';
  const dir: 'ltr' | 'rtl' = lang === 'ur' ? 'rtl' : 'ltr';
  return { lang, dir };
}

type MyDocumentProps = DocumentProps & { localeAttrs: LocaleAttrs };

class MyDocument extends Document<MyDocumentProps> {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx);
    const localeAttrs = parseLocale(ctx.req);
    return { ...initialProps, localeAttrs };
  }

  render() {
    const { localeAttrs } = this.props;

    return (
      <Html lang={localeAttrs.lang} dir={localeAttrs.dir} className="bg-background text-foreground" suppressHydrationWarning>
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
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600&family=Noto+Nastaliq+Urdu:wght@400;600&display=swap"
          />

          {/* PWA + Icons */}
          <link rel="manifest" href="/manifest.json" />
          <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
          <link rel="apple-touch-icon" href="/apple-touch-icon.svg" />

          {/* JSON-LD */}
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: orgJsonLdJson }} />

          {/* Pre-paint locale->dir fixer */}
          <script dangerouslySetInnerHTML={{ __html: localeBootstrapScript }} />

          <style>{`
            [dir="rtl"] body {
              font-family: 'Noto Nastaliq Urdu', 'Noto Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            }
          `}</style>
        </Head>
        <body className="bg-background text-foreground antialiased">
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
