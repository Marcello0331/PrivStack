import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  serverRuntimeConfig: {
    DATABASE_PATH: process.env.DATABASE_PATH || '/data/privstack.db',
  },
  publicRuntimeConfig: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  },
};

export default nextConfig;
