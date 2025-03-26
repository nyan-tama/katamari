import { MetadataRoute } from 'next';
import { createClientSupabase } from '@/lib/supabase-client';

// 記事ページのURLを動的に取得するためのヘルパー
async function getArticleSlugs() {
    try {
        const supabase = createClientSupabase();
        const { data } = await supabase
            .from('articles')
            .select('slug, updated_at')
            .eq('status', 'published')
            .order('updated_at', { ascending: false });

        return data || [];
    } catch (error) {
        console.error('サイトマップ生成エラー:', error);
        return [];
    }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // 静的なページのリスト
    const staticPages = [
        {
            url: 'https://katamari.jp',
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1.0,
        },
        {
            url: 'https://katamari.jp/articles',
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.8,
        },
    ];

    // 動的な記事ページをサイトマップに追加
    const articles = await getArticleSlugs();
    const articlePages = articles.map(article => ({
        url: `https://katamari.jp/articles/${article.slug}`,
        lastModified: new Date(article.updated_at),
        changeFrequency: 'weekly',
        priority: 0.7,
    }));

    return [...staticPages, ...articlePages];
} 