import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientSupabase, getPublicUrl } from '@/lib/supabase-client';
import { User } from '@supabase/supabase-js';
import { Article, UserProfile } from '@/app/types/profile';
import { fetchUserArticles } from '@/app/utils/profileUtils';

export default function useProfile() {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [userArticles, setUserArticles] = useState<Article[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const router = useRouter();

    // ユーザー情報と記事データを取得する関数
    const fetchUserData = async () => {
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
                .select('id, name, default_avatar_url, bio, website_url1, website_url2, website_url3, avatar_storage_bucket, avatar_storage_path, twitter_url, instagram_url, facebook_url, tiktok_url, github_url, created_at, updated_at')
                .eq('id', session.user.id)
                .single();

            if (profileError) {
                console.error('プロフィール取得エラー:', profileError);

                // バックアッププラン: 最小限の情報だけを取得してみる
                const { data: minimalProfileData, error: minimalError } = await supabase
                    .from('users')
                    .select('id, name, default_avatar_url')
                    .eq('id', session.user.id)
                    .single();

                if (minimalError) {
                    console.error('最小限プロフィール取得エラー:', minimalError);

                    // 最終手段：ユーザー情報からプロフィールを作成
                    const userBasedProfile: UserProfile = {
                        id: session.user.id,
                        name: session.user.user_metadata?.full_name || '名前なし',
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
            const articles = await fetchUserArticles(session.user.id, supabase);
            setUserArticles(articles || []);
        } catch (error) {
            console.error('Error loading user data:', error);
        } finally {
            setLoading(false);
        }
    };

    // ページにフォーカスが戻ったときに記事データを再取得
    const refreshArticles = async () => {
        if (!user) return;
        try {
            const supabase = createClientSupabase();
            const articles = await fetchUserArticles(user.id, supabase);
            setUserArticles(articles || []);
        } catch (error) {
            console.error('記事の再取得に失敗しました:', error);
        }
    };

    const handleEditToggle = () => {
        setIsEditing(!isEditing);

        if (!isEditing && profile) {
            setEditName(profile.name);

            // アバターURLの設定（優先順位付き）
            if (profile.avatar_storage_path) {
                // 1. カスタムアバターが最優先
                setAvatarPreview(getPublicUrl('avatars', profile.avatar_storage_path));
            } else if (profile.default_avatar_url) {
                // 2. 外部URL（Google等）
                setAvatarPreview(profile.default_avatar_url);
            } else {
                // アバターなし
                setAvatarPreview(null);
            }
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

    const handleAvatarButtonClick = (e: React.MouseEvent) => {
        e.preventDefault();

        // 直接隠しinput要素をクリック
        const fileInput = document.getElementById('avatar-upload') as HTMLInputElement;
        if (fileInput) {
            fileInput.click();
        }
    };

    const handleSaveProfile = async () => {
        if (!user || !editName.trim()) return;

        try {
            setIsSaving(true);
            const supabase = createClientSupabase();

            // プロフィール更新データ
            const updates: {
                name: string;
                default_avatar_url?: string;
                avatar_storage_path?: string;
            } = {
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
                updates.avatar_storage_path = avatarPath;
            }

            // プロフィール情報を更新
            if (profile) {
                const updatedProfile = {
                    ...profile,
                    name: updates.name,
                };

                // アバターパスが更新された場合は、正しいプロパティを更新
                if (updates.avatar_storage_path) {
                    updatedProfile.avatar_storage_path = updates.avatar_storage_path;
                    // default_avatar_urlは別の用途（Google等の外部URL）なので、更新しない
                }

                setProfile(updatedProfile);

                // 更新直後に画像表示を強制リフレッシュするため、プレビューも更新
                if (updates.avatar_storage_path) {
                    const refreshUrl = getPublicUrl('avatars', updates.avatar_storage_path) + `?t=${Date.now()}`;
                    setAvatarPreview(refreshUrl);
                }
            }

            const { error: updateError } = await supabase
                .from('users')
                .update(updates)
                .eq('id', user.id);

            if (updateError) throw updateError;

            // 成功したら編集モードを終了
            setIsEditing(false);

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

    // 初回レンダリング時にユーザーデータを取得
    useEffect(() => {
        fetchUserData();
    }, []);

    // ページにフォーカスが戻ったときに記事データを再取得
    useEffect(() => {
        const handleFocus = () => {
            // ユーザーが既にログインしている場合のみ再取得
            if (user) {
                refreshArticles();
            }
        };

        // ブラウザのフォーカスイベントに登録
        window.addEventListener('focus', handleFocus);

        // クリーンアップ関数
        return () => {
            window.removeEventListener('focus', handleFocus);
        };
    }, [user]);

    return {
        user,
        profile,
        loading,
        userArticles,
        isEditing,
        editName,
        avatarPreview,
        isSaving,
        handleEditToggle,
        handleAvatarChange,
        handleAvatarButtonClick,
        handleSaveProfile,
        handleDeleteAccount,
        setEditName,
        refreshArticles
    };
} 