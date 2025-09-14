/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true }, // let build succeed with TS errors
  eslint: { ignoreDuringBuilds: true },    // skip ESLint in prod build
};
module.exports = nextConfig;
