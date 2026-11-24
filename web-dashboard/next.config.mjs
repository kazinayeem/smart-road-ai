/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // STATIC_EXPORT=1 builds a static site into ./out for Firebase Hosting (every page is client-rendered;
  // access control lives in the database security rules, not on a server).
  ...(process.env.STATIC_EXPORT === '1' ? { output: 'export', trailingSlash: false } : {}),
  // Always inline these flags (unset vars are otherwise left as runtime lookups, which would keep
  // the demo-credentials module in the production bundle).
  env: {
    NEXT_PUBLIC_ENABLE_DEMO_LOGIN: process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN || '0',
    NEXT_PUBLIC_USE_FIREBASE_EMULATORS: process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS || '0',
  },
  // Lets a second dev server (e.g. the emulator-backed test server) use its own build folder.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
