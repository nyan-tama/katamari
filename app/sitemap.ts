import { MetadataRoute } from 'next';
import { getServerSupabase } from '@/lib/supabase-server';

// サイトのURLを設定
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://katamari.jp';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // 固定ページのURLを追加
    const staticPaths = [
        {
            url: `${baseUrl}`,
            lastModified: new Date(),
            changeFrequency: 'daily' as const,
            priority: 1.0,
        },
        {
            url: `${baseUrl}/articles`,
            lastModified: new Date(),
            changeFrequency: 'daily' as const,
            priority: 0.8,
        },
        {
            url: `${baseUrl}/login`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.3,
        },
    ];

    // DBから動的ページのURLを取得（作れるもの一覧）
    try {
        const supabase = getServerSupabase();
        const { data: articles } = await supabase
            .from('articles')
            .select('slug, updated_at')
            .eq('status', 'published')
            .order('updated_at', { ascending: false });

        // 動的ページのURLを追加
        const dynamicPaths = articles?.map((article: { slug: string; updated_at: string }) => ({
            url: `${baseUrl}/articles/${article.slug}`,
            lastModified: new Date(article.updated_at),
            changeFrequency: 'weekly' as const,
            priority: 0.7,
        })) || [];

        // 静的ページと動的ページを結合して返す
        return [...staticPaths, ...dynamicPaths];
    } catch (error) {
        console.error('Sitemap generation error:', error);
        // エラーが発生した場合は静的ページのみ返す
        return staticPaths;
    }
} 