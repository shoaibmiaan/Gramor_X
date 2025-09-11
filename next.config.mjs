// next.config.mjs (ESM)
import { withSentryConfig } from '@sentry/nextjs';
import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // No SW in dev to avoid caching headaches
  disable: process.env.NODE_ENV === 'development',
});

// Turn bypass ON by default; set to "0" to enforce locally/CI
const BYPASS_STRICT = process.env.BYPASS_STRICT_BUILD !== '0';

/** Security headers (Step 7.3) */
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'strict-dynamic' https:",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Images (merged to avoid overriding remotePatterns)
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'inline',
  },

  // Tree-shake icon libs
  modularizeImports: {
    'lucide-react': { transform: 'lucide-react/icons/{{member}}' },
    '@heroicons/react/24/solid': { transform: '@heroicons/react/24/solid/{{member}}' },
    '@heroicons/react/24/outline': { transform: '@heroicons/react/24/outline/{{member}}' },
    'react-icons/?(((\\w*)?/?)*)': { transform: 'react-icons/{{matches.[1]}}' },
  },

  // Don’t block builds on lint/type errors when bypassing
  eslint: { ignoreDuringBuilds: BYPASS_STRICT },
  typescript: { ignoreBuildErrors: BYPASS_STRICT },

  // Add security headers to all routes
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default withSentryConfig(withPWA(nextConfig), {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: 'solvio-advisors',
  project: 'javascript-nextjs',

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: '/monitoring',

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors.
  automaticVercelMonitors: true,
});
