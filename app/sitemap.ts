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
            url: `${baseUrl}/models`,
            lastModified: new Date(),
        },
    ];

    // 動的コンテンツ（モデル詳細ページ）を取得
    const supabase = createServerComponentClient({ cookies });

    const { data: models } = await supabase
        .from('models')
        .select('id, updated_at')
        .order('updated_at', { ascending: false });

    const modelPages = models?.map((model) => ({
        url: `${baseUrl}/models/${model.id}`,
        lastModified: new Date(model.updated_at),
    })) || [];

    return [...staticPages, ...modelPages];
} 