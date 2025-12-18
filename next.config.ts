import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "*.public.blob.vercel-storage.com" },
      { hostname: "avatars.githubusercontent.com" },
      { hostname: "lh3.googleusercontent.com" },
      { hostname: "localhost" },
      { hostname: "vercel.app" },
      { hostname: "hugharmony-files-prod.s3.us-east-2.amazonaws.com" },
    ],
  },
};

// Named export to satisfy ESLint import/no-anonymous-default-export
const pwaConfig = withPWA({
  dest: "public",
  register: true,
  disable: process.env.NODE_ENV === "development", // Skip in dev for Turbopack
  cacheOnFrontEndNav: true, // Cache on client navigation (/dashboard/[id])
  aggressiveFrontEndNavCaching: true, // Smoother UX
  reloadOnOnline: true, // Reload on reconnect

  workboxOptions: {
    disableDevLogs: true, // Cleaner logs
  },
})(nextConfig);

// Named export to fix ESLint
const config = (phase: string) => {
  if (phase === "phase-development" || phase === "phase-production-build") {
    return pwaConfig;
  }
  return nextConfig;
};

export default config;
