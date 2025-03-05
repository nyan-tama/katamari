/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        domains: [
            'nextjs.org',
            'oshpdiqwxbryvcmhonts.supabase.co',
            'dhvkmwrudleimrzppamd.supabase.co',
            'jp.store.bambulab.com'
        ],
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**.googleusercontent.com',
            },
            {
                protocol: 'https',
                hostname: '**.supabase.co',
            },
        ],
        unoptimized: true,
    },
};

module.exports = nextConfig; 