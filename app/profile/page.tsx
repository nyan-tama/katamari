'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientSupabase, getPublicUrl } from '@/lib/supabase-client';
import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import Image from 'next/image'

// 記事型定義
interface Article {
    id: string;
    title: string;
    content: string;
    hero_image?: string;
    status: 'draft' | 'published';
    created_at: string;
    updated_at: string;
    view_count: number;
    download_count: number;
}

// ユーザープロフィール型定義
interface UserProfile {
    id: string;
    name: string;
    email: string;
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
// アバターURLを適切に処理する関数（非推奨 - 新しい実装ではImageコンポーネントを使用）
// const getAvatarUrl = (avatarPath: string | null): string => {
//     if (!avatarPath) return '';

//     // 外部URL（http/
//     if (avatarPath.startsWith('http')) {
//         return avatarPath;
//     }

//     // ローカルファイルの場合はSupabaseのStorageから取得
//     return getPublicUrl('avatars', avatarPath);
// };

export default function ProfilePage() {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [userArticles, setUserArticles] = useState<Article[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const getUser = async () => {
            try {
                setLoading(true);
                const supabase = createClientSupabase();
                const { data: { session } } = await supabase.auth.getSession();

                if (!session?.user) {
                    // ログインしていない場合はログインページへリダイレクト
                    router.push('/login');
                    return;
                }

                setUser(session.user);

                console.log('ユーザーメタデータ:', session.user.user_metadata);

                // ユーザープロフィール情報を取得 - 実際のテーブル構造に合わせたクエリ
                const { data: profileData, error: profileError } = await supabase
                    .from('users')
                    .select('id, name, email, default_avatar_url, bio, website_url1, website_url2, website_url3, avatar_storage_bucket, avatar_storage_path, twitter_url, instagram_url, facebook_url, tiktok_url, github_url, created_at, updated_at')
                    .eq('id', session.user.id)
                    .single();

                if (profileError) {
                    console.error('プロフィール取得エラー:', profileError);

                    // バックアッププラン: 最小限の情報だけを取得してみる
                    const { data: minimalProfileData, error: minimalError } = await supabase
                        .from('users')
                        .select('id, name, email, default_avatar_url')
                        .eq('id', session.user.id)
                        .single();

                    if (minimalError) {
                        console.error('最小限プロフィール取得エラー:', minimalError);

                        // 最終手段：ユーザー情報からプロフィールを作成
                        const userBasedProfile: UserProfile = {
                            id: session.user.id,
                            name: session.user.user_metadata?.full_name || '名前なし',
                            email: session.user.email || '',
                            default_avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null,
                            bio: null,
                            website_url1: null,
                            website_url2: null,
                            website_url3: null,
                            avatar_storage_bucket: 'avatars',
                            avatar_storage_path: null,
                            twitter_url: null,
                            instagram_url: null,
                            facebook_url: null,
                            tiktok_url: null,
                            github_url: null,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        };

                        setProfile(userBasedProfile);
                        setEditName(userBasedProfile.name);
                    } else if (minimalProfileData) {
                        // 必要なフィールドをすべて含む完全なプロフィールを作成
                        const completeProfile: UserProfile = {
                            ...minimalProfileData,
                            bio: null,
                            website_url1: null,
                            website_url2: null,
                            website_url3: null,
                            avatar_storage_bucket: 'avatars',
                            avatar_storage_path: null,
                            twitter_url: null,
                            instagram_url: null,
                            facebook_url: null,
                            tiktok_url: null,
                            github_url: null,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        };

                        // Googleのプロフィール画像URLがない場合はセッションから補完
                        if (!completeProfile.default_avatar_url) {
                            completeProfile.default_avatar_url = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null;
                        }

                        setProfile(completeProfile);
                        setEditName(completeProfile.name);
                    }
                } else if (profileData) {
                    // デフォルトアバターURLがない場合はセッションから補完
                    if (!profileData.default_avatar_url) {
                        profileData.default_avatar_url = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null;
                    }
                    setProfile(profileData);
                    setEditName(profileData.name);
                }

                // ユーザーの投稿した記事を取得
                const { data, error } = await supabase
                    .from('articles')
                    .select('*')
                    .eq('author_id', session.user.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                setUserArticles(data || []);
            } catch (error) {
                console.error('Error loading user data:', error);
            } finally {
                setLoading(false);
            }
        };

        getUser();
    }, [router]);

    const handleEditToggle = () => {
        setIsEditing(!isEditing);
        if (!isEditing && profile) {
            setEditName(profile.name);
            setAvatarPreview(profile.default_avatar_url);
        }
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // ファイルサイズのバリデーション (最大5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('画像サイズが大きすぎます（最大5MB）');
            return;
        }

        setAvatarFile(file);

        // プレビュー用のURLを作成
        const reader = new FileReader();
        reader.onloadend = () => {
            setAvatarPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleSaveProfile = async () => {
        if (!user || !editName.trim()) return;

        try {
            setIsSaving(true);
            const supabase = createClientSupabase();

            // プロフィール更新データ
            const updates: { name: string; default_avatar_url?: string } = {
                name: editName.trim(),
            };

            // アバター画像が選択されていれば、アップロード
            if (avatarFile) {
                const avatarExt = avatarFile.name.split('.').pop();
                const avatarPath = `${user.id}/${Date.now()}.${avatarExt}`;

                // 古いアバター画像があれば削除
                if (profile?.avatar_storage_path && !profile.avatar_storage_path.startsWith('http')) {
                    try {
                        await supabase.storage
                            .from('avatars')
                            .remove([profile.avatar_storage_path]);
                    } catch (error) {
                        console.error('古いアバター削除エラー:', error);
                        // エラーは無視して続行
                    }
                }

                // 新しいアバター画像をアップロード
                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(avatarPath, avatarFile, {
                        upsert: true,
                        cacheControl: '3600',
                    });

                if (uploadError) throw uploadError;

                // アップロードに成功したらパスを更新データに追加
                updates.default_avatar_url = avatarPath;
            }

            // プロフィール情報を更新
            const { error: updateError } = await supabase
                .from('users')
                .update(updates)
                .eq('id', user.id);

            if (updateError) throw updateError;

            // 成功したら編集モードを終了
            setIsEditing(false);

            // プロフィール情報を更新
            if (profile) {
                setProfile({
                    ...profile,
                    name: updates.name,
                    default_avatar_url: updates.default_avatar_url !== undefined ? updates.default_avatar_url : profile.default_avatar_url,
                });
            }

            alert('プロフィールが更新されました');
        } catch (error) {
            console.error('プロフィール更新エラー:', error);
            alert('プロフィールの更新中にエラーが発生しました');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!user || !confirm('本当にアカウントを削除しますか？この操作は元に戻せません。')) {
            return;
        }

        try {
            const supabase = createClientSupabase();

            // 1. ユーザーの記事に関連するデータを削除
            // 記事のメディアと添付ファイルを削除するロジックが必要

            // 2. ユーザーの記事を削除
            await supabase
                .from('articles')
                .delete()
                .eq('author_id', user.id);

            // 3. ユーザープロフィールを削除
            await supabase
                .from('users')
                .delete()
                .eq('id', user.id);

            // 4. 認証情報を削除
            await supabase.auth.signOut();

            // 5. ホームページにリダイレクト
            router.push('/');

        } catch (error) {
            console.error('アカウント削除エラー:', error);
            alert('アカウントの削除中にエラーが発生しました');
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <p className="text-center">読み込み中...</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
                {/* プロフィール情報 */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                        {/* プロフィール画像 */}
                        <div className="flex-shrink-0">
                            {isEditing ? (
                                <div className="w-32 h-32 relative rounded-full overflow-hidden border-2 border-gray-200">
                                    {avatarPreview ? (
                                        <img
                                            src={avatarPreview}
                                            alt="プロフィール画像プレビュー"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                                            <span className="text-3xl">👤</span>
                                        </div>
                                    )}
                                    <label
                                        htmlFor="avatar-upload"
                                        className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 cursor-pointer transition-opacity"
                                    >
                                        <span className="text-white text-sm font-medium">変更</span>
                                        <input
                                            id="avatar-upload"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleAvatarChange}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                            ) : (
                                <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-gray-200">
                                    {/* アバター画像の優先順位: Googleアバター(default_avatar_url) -> カスタムアバター(avatar_url) -> デフォルトアイコン */}
                                    {profile?.default_avatar_url ? (
                                        <Image
                                            src={
                                                // Googleアバターが存在すればそれを使用
                                                profile.default_avatar_url && profile.default_avatar_url.startsWith('http')
                                                    ? profile.default_avatar_url
                                                    // Supabaseストレージのパスがある場合は公開URLを取得
                                                    : profile.default_avatar_url
                                                        ? getPublicUrl('avatars', profile.default_avatar_url)
                                                        : '/default-avatar.png' // デフォルト画像
                                            }
                                            alt={profile.name}
                                            width={128}
                                            height={128}
                                            className="object-cover w-full h-full"
                                            unoptimized={true}
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                                            <span className="text-3xl">👤</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ユーザー情報 */}
                        <div className="flex-grow text-center md:text-left">
                            {isEditing ? (
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                        名前
                                    </label>
                                    <input
                                        type="text"
                                        id="name"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 mb-4"
                                    />
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={handleSaveProfile}
                                            disabled={isSaving}
                                            className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-md disabled:bg-pink-300"
                                        >
                                            {isSaving ? '保存中...' : '保存'}
                                        </button>
                                        <button
                                            onClick={handleEditToggle}
                                            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md"
                                        >
                                            キャンセル
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-800 mb-2">{profile?.name}</h1>
                                    <p className="text-gray-600 mb-4">{user?.email}</p>
                                    <button
                                        onClick={handleEditToggle}
                                        className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-md"
                                    >
                                        プロフィールを編集
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* タブナビゲーション */}
                <div className="border-b border-gray-200 mb-8">
                    <nav className="-mb-px flex">
                        <button className="text-pink-600 border-pink-500 py-4 px-1 border-b-2 font-medium mr-8">
                            記事
                        </button>
                    </nav>
                </div>

                {/* 記事一覧 */}
                {userArticles.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {userArticles.map((article) => (
                            <div key={article.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                                <div className="aspect-video bg-gray-100 relative">
                                    {article.hero_image ? (
                                        <img
                                            src={article.hero_image}
                                            alt={article.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-gray-400">
                                            <span className="text-4xl">📄</span>
                                        </div>
                                    )}
                                    {article.status === 'draft' && (
                                        <div className="absolute top-2 right-2 bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded">
                                            下書き
                                        </div>
                                    )}
                                </div>
                                <div className="p-4">
                                    <h3 className="font-medium text-gray-900 mb-1 truncate">{article.title}</h3>
                                    <div className="flex justify-between text-sm text-gray-500 mb-3">
                                        <span>{new Date(article.created_at).toLocaleDateString('ja-JP')}</span>
                                        <div className="flex space-x-2">
                                            <span>👁️ {article.view_count}</span>
                                            <span>⬇️ {article.download_count}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between">
                                        <Link
                                            href={`/articles/${article.id}`}
                                            className="text-pink-500 hover:text-pink-600"
                                        >
                                            詳細を見る
                                        </Link>
                                        <Link
                                            href={`/articles/${article.id}/edit`}
                                            className="text-gray-500 hover:text-gray-700"
                                        >
                                            編集
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-white rounded-lg shadow-md">
                        <div className="text-gray-400 text-5xl mb-4">📝</div>
                        <h3 className="text-xl font-medium text-gray-700 mb-2">まだ記事がありません</h3>
                        <p className="text-gray-500 mb-6">あなたの知識や経験を共有しましょう！</p>
                        <Link
                            href="/articles/new"
                            className="bg-pink-500 hover:bg-pink-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                        >
                            記事を作成する
                        </Link>
                    </div>
                )}

                {/* アカウント削除セクション */}
                <div className="mt-12 pt-4 border-t border-gray-200">
                    <div className="text-right">
                        {showDeleteConfirm ? (
                            <div className="bg-red-50 border border-red-200 p-4 rounded-md mb-4">
                                <p className="text-red-600 mb-4">
                                    アカウントを削除すると、すべての記事と関連データが完全に削除されます。この操作は元に戻せません。
                                </p>
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md"
                                    >
                                        キャンセル
                                    </button>
                                    <button
                                        onClick={handleDeleteAccount}
                                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md"
                                    >
                                        アカウントを完全に削除する
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="text-red-500 hover:text-red-600"
                            >
                                アカウントを削除
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}