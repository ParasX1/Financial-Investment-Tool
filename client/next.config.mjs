import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  outputFileTracingRoot: fileURLToPath(new URL('.', import.meta.url)),
  transpilePackages: [
    '@mui/material',
    '@mui/icons-material',
    '@mui/system',
    '@mui/utils',
  ],
};

export default nextConfig;
