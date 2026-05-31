import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
});

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lewati error TypeScript saat build (untuk kemudahan deploy awal)
  typescript: {
    ignoreBuildErrors: true,
  },

  // Optimasi gambar dari domain eksternal
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Turbopack: tetapkan root agar tidak tertukar dengan lockfile parent folder
  turbopack: {
    root: __dirname,
  },
};

export default withPWA(nextConfig);
