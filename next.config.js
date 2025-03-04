/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        domains: ['nextjs.org'],
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**.googleusercontent.com',
            },
        ],
    },
};

module.exports = nextConfig; 