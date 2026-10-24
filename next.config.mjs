/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lets `NEXT_DIST_DIR=.next-build npm run build` run without clobbering a live dev server's .next cache.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Linting and type checks run in CI and locally (npx tsc --noEmit). Skipping them in the
  // production build keeps memory low enough for a 512 MB host.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
