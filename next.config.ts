import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'peptideos.drfamily.com.br' },
      { protocol: 'https', hostname: 'peptidezhealth.com.br' },
    ],
  },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
