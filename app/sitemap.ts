import { MetadataRoute } from 'next';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // サイトマップ生成でのベースURL
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://katamari.jp';

    // 静的ページ - ログインページを除外
    const staticPages = [
        {
            url: baseUrl,
            lastModified: new Date(),
        },
        {
            url: `${baseUrl}/articles`,
            lastModified: new Date(),
        },
    ];

    // 動的コンテンツ（記事詳細ページ）を取得
    const supabase = createServerComponentClient({ cookies });

    const { data: articles } = await supabase
        .from('articles')
        .select('id, updated_at')
        .order('updated_at', { ascending: false });

    const articlePages = articles?.map((article) => ({
        url: `${baseUrl}/articles/${article.id}`,
        lastModified: new Date(article.updated_at),
    })) || [];

    return [...staticPages, ...articlePages];
} 