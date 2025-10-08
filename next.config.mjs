// next.config.mjs
import withPWA from 'next-pwa';

// --- Security: CSP ---
const csp = [
  "default-src 'self';",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: https://js.stripe.com https://browser.sentry-cdn.com;",
  "style-src 'self' 'unsafe-inline' https:;",
  "img-src 'self' data: blob: https:;",
  "font-src 'self' data: https:;",
  "connect-src 'self' https: wss:;",
  "frame-src https://js.stripe.com https://*.stripe.com;",
  "object-src 'none';",
  "base-uri 'self';",
  "form-action 'self';",
].join(' ');

// Read Supabase project host if available
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
let supabaseHost = '';
try {
  if (SUPABASE_URL) supabaseHost = new URL(SUPABASE_URL).host;
} catch { /* ignore */ }

const baseConfig = {
  experimental: { esmExternals: false },

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

  productionBrowserSourceMaps: false,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  webpack: (config) => {
    // keep your existing wasm output tweak
    config.output.webassemblyModuleFilename = 'static/wasm/[modulehash].wasm';

    return config;
  },

  // Allow next/image to load from Supabase Storage + common CDNs
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
    domains: [
      ...new Set(
        [
          supabaseHost,
          'lh3.googleusercontent.com',
          'res.cloudinary.com',
          'images.unsplash.com',
        ].filter(Boolean)
      ),
    ],
  },
};

export default withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  buildExcludes: [/.*\.map$/, /middleware-manifest\.json$/, /server\/middleware-manifest\.json$/],
  publicExcludes: ['**/*.map'],
})(baseConfig);
