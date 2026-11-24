/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
