import { Article } from '@/app/types/profile';
import { createClientSupabase } from '@/lib/supabase-client';

// 記事のヒーロー画像URLを取得する関数
export const fetchHeroImages = async (articles: Article[], supabase: any) => {
    // hero_image_idがある記事のIDのみを抽出
    const articleIds = articles.filter(a => a.hero_image_id).map(a => a.hero_image_id);

    if (articleIds.length === 0) return;

    try {
        const { data: mediaData, error: mediaError } = await supabase
            .from('article_media')
            .select('*')
            .in('id', articleIds);

        if (mediaError) throw mediaError;

        // メディア情報をマッピング
        const mediaMap = mediaData.reduce((acc: any, media: any) => {
            acc[media.id] = media;
            return acc;
        }, {});

        // 記事データにヒーロー画像URLを追加
        articles.forEach(article => {
            if (article.hero_image_id && mediaMap[article.hero_image_id]) {
                const media = mediaMap[article.hero_image_id];
                const { data } = supabase.storage
                    .from(media.storage_bucket)
                    .getPublicUrl(media.storage_path);

                article.hero_image_url = data.publicUrl;
            }
        });
    } catch (error) {
        console.error('ヒーロー画像の取得に失敗しました:', error);
    }
}

// 記事データを取得する関数
export const fetchUserArticles = async (userId: string, supabase: any) => {
    try {
        const { data, error } = await supabase
            .from('articles')
            .select('*')
            .eq('author_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // ヒーロー画像URLを取得
        await fetchHeroImages(data, supabase);

        return data;
    } catch (error) {
        console.error('記事の取得に失敗しました:', error);
        return [];
    }
} 