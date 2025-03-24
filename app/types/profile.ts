// 記事型定義
export interface Article {
    id: string;
    title: string;
    content: string;
    hero_image_id?: string;
    hero_image_url?: string;
    status: 'draft' | 'published';
    created_at: string;
    updated_at: string;
    view_count: number;
    download_count: number;
    slug: string;
}

// ユーザープロフィール型定義
export interface UserProfile {
    id: string;
    name: string;
    default_avatar_url: string | null;
    bio: string | null;
    website_url1: string | null;
    website_url2: string | null;
    website_url3: string | null;
    avatar_storage_bucket: string | null;
    avatar_storage_path: string | null;
    twitter_url: string | null;
    instagram_url: string | null;
    facebook_url: string | null;
    tiktok_url: string | null;
    github_url: string | null;
    created_at: string;
    updated_at: string;
} 