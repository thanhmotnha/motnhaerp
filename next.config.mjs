/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    serverExternalPackages: ['bcryptjs', '@sentry/nextjs'],
};

export default nextConfig;
