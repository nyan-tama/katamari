import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://katamari.jp';

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/api/', '/login/', '/profile/'],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    };
} 