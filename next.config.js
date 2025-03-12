/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        domains: [
            'nextjs.org',
            'oshpdiqwxbryvcmhonts.supabase.co',
            'dhvkmwrudleimrzppamd.supabase.co',
            'lh3.googleusercontent.com',
            'jp.store.bambulab.com',
            'katamari.jp'
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