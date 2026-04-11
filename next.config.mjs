/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    serverExternalPackages: ['bcryptjs', '@sentry/nextjs', 'sharp'],
};

export default nextConfig;
