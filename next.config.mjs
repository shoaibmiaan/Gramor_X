// next.config.mjs
import fs from 'node:fs';
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

const writingBundlePath = new URL('./lib/offline/packages/writing.bundle.json', import.meta.url);
let writingBundleAssets = [];
try {
  const raw = fs.readFileSync(writingBundlePath, 'utf8');
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed?.assets)) {
    writingBundleAssets = parsed.assets
      .map((asset) => ({ url: asset?.url, revision: asset?.revision }))
      .filter((asset) => typeof asset.url === 'string' && typeof asset.revision === 'string');
  }
} catch {
  writingBundleAssets = [];
}

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
      {
        source: '/audio/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
          },
          { key: 'Accept-Ranges', value: 'bytes' },
          { key: 'Access-Control-Expose-Headers', value: 'Accept-Ranges, Content-Length' },
        ],
      },
      {
        source: '/placement/audio/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
          },
          { key: 'Accept-Ranges', value: 'bytes' },
          { key: 'Access-Control-Expose-Headers', value: 'Accept-Ranges, Content-Length' },
        ],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: '/mock-tests',
        destination: '/mock',
        permanent: false,
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
      ...new Set(
        [
          '**.supabase.co',
          supabaseHost,
          'lh3.googleusercontent.com',
          'res.cloudinary.com',
          'images.unsplash.com',
        ].filter(Boolean)
      ),
    ].map((hostname) => ({ protocol: 'https', hostname })),
  },
};

export default withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  buildExcludes: [/.*\.map$/, /middleware-manifest\.json$/, /server\/middleware-manifest\.json$/],
  publicExcludes: ['**/*.map'],
  importScripts: ['sw-sync.js', 'sw-patches/push-handler.js'],
})(baseConfig);
