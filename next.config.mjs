// next.config.mjs
// ESM Next.js config (Next 14)
// - Sets a sane CSP (no 'strict-dynamic'), allows common vendors used in your app
// - Disables production browser sourcemaps
// - Configures next-pwa and excludes .map files from the precache (fixes Workbox 404)
// - Ignores ESLint errors during builds so deploys aren’t blocked

import withPWA from 'next-pwa';

// Tune these as needed for your stack.
// Keep it tight; add vendors only when the console tells you they’re blocked.
const csp = [
  "default-src 'self';",
  // Next injects some inline/runtime bits; many libraries use eval in dev/prod bundles.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: https://js.stripe.com https://browser.sentry-cdn.com;",
  "style-src 'self' 'unsafe-inline' https:;",
  "img-src 'self' data: blob: https:;",
  "font-src 'self' data: https:;",
  // API/websocket calls (Supabase, Sentry, Stripe, your own APIs)
  "connect-src 'self' https: wss:;",
  // Allow Stripe hosted elements/iframes, etc.
  "frame-src https://js.stripe.com https://*.stripe.com;",
  // Good hygiene
  "object-src 'none';",
  "base-uri 'self';",
  "form-action 'self';",
  // uncomment if you know you’ll never mix http assets
  // "upgrade-insecure-requests;"
].join(' ');

const baseConfig = {
  // Helpful security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },

  // Avoid generating .map files for the browser in prod
  productionBrowserSourceMaps: false,

  // Let build continue even with ESLint errors/warnings
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Keep TS strictness (flip to true only if you need to unblock quickly)
  typescript: {
    ignoreBuildErrors: false,
  },

  // (Optional) If you need trailingSlash or other Next options, add them here.
  // trailingSlash: false,
};

// Wrap with PWA config
export default withPWA({
  dest: 'public',
  // Don’t register SW in dev; do in prod
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,

  // Prevent Workbox from trying to precache sourcemaps or Next internals that 404 in prod
  buildExcludes: [
    /.*\.map$/,                           // any source map
    /middleware-manifest\.json$/,         // Next internals
    /server\/middleware-manifest\.json$/,
  ],

  // Also keep .map files out of the public precache manifest
  publicExcludes: ['**/*.map'],
})(baseConfig);
