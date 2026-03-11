import type { GetServerSideProps } from 'next';

import { isSitemapEligible } from '@/lib/routing/governance';

const STATIC_ROUTES = [
  '/',
  '/pricing',
  '/learning',
  '/mock',
  '/listening',
  '/reading',
  '/writing',
  '/speaking',
  '/leaderboard',
  '/blog',
  '/faq',
  '/community',
  '/waitlist',
] as const;

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://gramorx.com').replace(/\/$/, '');

function generateSitemap() {
  const urls = STATIC_ROUTES.filter((route) => isSitemapEligible(route))
    .map(
      (route) => `  <url>\n    <loc>${siteUrl}${route}</loc>\n  </url>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader('Content-Type', 'text/xml');
  res.write(generateSitemap());
  res.end();

  return {
    props: {},
  };
};

export default function SitemapXml() {
  return null;
}
