/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lets `NEXT_DIST_DIR=.next-build npm run build` run without clobbering a live dev server's .next cache.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
