'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientSupabase, getPublicUrl } from '@/lib/supabase-client';
import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import Image from 'next/image'
// モデル型定義
interface Model {
    id: string;
    title: string;
    description?: string;
    thumbnail_url?: string;
    file_url: string;
    created_at: string;
}

// ユーザープロフィール型定義
interface UserProfile {
    id: string;
    name: string;
    avatar_url: string | null;
}

// アバターURLを適切に処理する関数（非推奨 - 新しい実装ではImageコンポーネントを使用）
const getAvatarUrl = (avatarPath: string | null): string => {
    if (!avatarPath) return '';
    
    // 外部URL（http/https）の場合はそのまま返す
    if (avatarPath.startsWith('http')) {
        return avatarPath;
    }
    
    // ローカルファイルの場合はSupabaseのStorageから取得
    return getPublicUrl('avatars', avatarPath);
};

export default function ProfilePage() {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [userModels, setUserModels] = useState<Model[]>([]);
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

                // ユーザープロフィール情報を取得
                const { data: profileData, error: profileError } = await supabase
                    .from('users')
                    .select('id, name, avatar_url')
                    .eq('id', session.user.id)
                    .single();

                if (profileError) {
                    console.error('プロフィール取得エラー:', profileError);
                } else if (profileData) {
                    setProfile(profileData);
                    setEditName(profileData.name);
                }

                // ユーザーの投稿したモデルを取得
                const { data, error } = await supabase
                    .from('models')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                setUserModels(data || []);
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
        // 編集モードをキャンセルした場合は元の値に戻す
        if (isEditing && profile) {
            setEditName(profile.name);
            setAvatarPreview(null);
            setAvatarFile(null);
        }
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 画像ファイルのみ許可（MIME typeチェック）
        if (!file.type.startsWith('image/')) {
            alert('画像ファイルを選択してください');
            return;
        }

        // ファイルサイズチェック（2MB以下）
        if (file.size > 2 * 1024 * 1024) {
            alert('ファイルサイズは2MB以下にしてください');
            return;
        }

        setAvatarFile(file);
        
        // プレビュー用URL生成
        const reader = new FileReader();
        reader.onloadend = () => {
            setAvatarPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleSaveProfile = async () => {
        if (!user || !profile) return;
        
        try {
            setIsSaving(true);
            const supabase = createClientSupabase();
            
            let avatarUrl = profile.avatar_url;

            // アバター画像がアップロードされた場合
            if (avatarFile) {
                // 古いアバター画像を削除（存在する場合かつSupabaseストレージの場合のみ）
                if (profile.avatar_url && !profile.avatar_url.startsWith('http')) {
                    console.log('Removing old avatar from storage:', profile.avatar_url);
                    await supabase.storage.from('avatars').remove([profile.avatar_url]);
                }
                
                // 新しいアバター画像をアップロード
                const filePath = `${user.id}/${Date.now()}_${avatarFile.name}`;
                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, avatarFile);
                
                if (uploadError) {
                    throw uploadError;
                }
                
                avatarUrl = filePath;
            }
            
            // プロフィール情報を更新
            const { error: updateError } = await supabase
                .from('users')
                .update({
                    name: editName,
                    avatar_url: avatarUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);
            
            if (updateError) {
                throw updateError;
            }
            
            // 成功したら編集モードを終了し、プロフィール情報を更新
            setProfile({
                ...profile,
                name: editName,
                avatar_url: avatarUrl
            });
            setIsEditing(false);
            alert('プロフィールを更新しました');
            
        } catch (error) {
            console.error('プロフィール更新エラー:', error);
            alert('プロフィールの更新に失敗しました');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!user) return;
        
        if (!confirm('本当にアカウントを削除しますか？この操作は取り消せません。')) {
            return;
        }
        
        try {
            setIsSaving(true);
            const supabase = createClientSupabase();
            
            // ユーザーのモデルファイルとサムネイルを削除
            for (const model of userModels) {
                if (model.file_url) {
                    await supabase.storage.from('model_files').remove([model.file_url]);
                }
                if (model.thumbnail_url) {
                    await supabase.storage.from('model_thumbnails').remove([model.thumbnail_url]);
                }
            }
            
            // アバター画像があれば削除（Supabaseストレージの場合のみ）
            if (profile?.avatar_url && !profile.avatar_url.startsWith('http')) {
                console.log('Removing avatar from storage on account delete:', profile.avatar_url);
                await supabase.storage.from('avatars').remove([profile.avatar_url]);
            }
            
            // Supabase Authからユーザーを削除
            const { error } = await supabase.auth.admin.deleteUser(user.id);
            if (error) throw error;
            
            // ログアウト処理
            await supabase.auth.signOut();
            
            // ホームページにリダイレクト
            router.push('/');
            alert('アカウントが削除されました');
            
        } catch (error) {
            console.error('アカウント削除エラー:', error);
            alert('アカウントの削除に失敗しました');
        } finally {
            setIsSaving(false);
            setShowDeleteConfirm(false);
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center py-12">
                    <p>読み込み中...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
                {/* プロフィールヘッダー */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    {isEditing ? (
                        // 編集モード
                        <div className="flex flex-col gap-6">
                            <div className="flex justify-between items-center border-b pb-2">
                                <h2 className="text-xl font-bold text-gray-800">ユーザー情報編集</h2>
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-1.5 rounded-md transition-colors text-sm"
                                >
                                    アカウント削除
                                </button>
                            </div>
                            
                            <div className="w-full md:flex md:gap-6">
                                {/* アバター編集 - スマホでは中央揃え、PCでは左揃え */}
                                <div className="flex flex-col items-center md:items-start md:w-1/3 mb-6 md:mb-0">
                                    <div className="w-24 h-24 bg-gray-200 rounded-full overflow-hidden mb-2 relative">
                                        {avatarPreview ? (
                                            <img src={avatarPreview} alt="Avatar Preview" className="w-full h-full object-cover" />
                                        ) : profile?.avatar_url ? (
                                            profile.avatar_url.startsWith('http') ? (
                                                <Image 
                                                    src={profile.avatar_url}
                                                    alt="Current Avatar"
                                                    width={96}
                                                    height={96}
                                                    className="object-cover"
                                                    onError={(e) => {
                                                        console.error('Avatar image failed to load in edit mode:', profile.avatar_url);
                                                        const target = e.target as HTMLImageElement;
                                                        target.style.display = 'none';
                                                        if (target.parentElement) {
                                                            target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center text-gray-500 text-3xl">${profile?.name?.charAt(0).toUpperCase() || 'U'}</div>`;
                                                        }
                                                    }}
                                                />
                                            ) : (
                                                <img 
                                                    src={getPublicUrl('avatars', profile.avatar_url)} 
                                                    alt="Current Avatar" 
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        console.error('Avatar image failed to load in edit mode:', profile.avatar_url);
                                                        e.currentTarget.onerror = null;
                                                        e.currentTarget.src = '';
                                                        e.currentTarget.className = 'hidden';
                                                        e.currentTarget.parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center text-gray-500 text-3xl">${profile?.name?.charAt(0).toUpperCase() || 'U'}</div>`;
                                                    }}
                                                />
                                            )
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-500 text-3xl">
                                                {profile?.name?.charAt(0).toUpperCase() || 'U'}
                                            </div>
                                        )}
                                    </div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 mt-3">
                                        プロフィール画像
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarChange}
                                        className="w-full max-w-xs text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100"
                                    />
                                </div>
                                
                                {/* 名前編集とボタン - PCでは右側に配置 */}
                                <div className="w-full md:w-2/3">
                                    <div className="mb-6">
                                        <label htmlFor="userName" className="block text-sm font-medium text-gray-700 mb-1">
                                            表示名
                                        </label>
                                        <input
                                            type="text"
                                            id="userName"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                                            required
                                        />
                                    </div>
                                    
                                    {/* 操作ボタン - スマホでは中央揃え、PCでは左揃え */}
                                    <div className="flex flex-col gap-4 mt-6">
                                        <div className="flex gap-2 justify-center md:justify-start">
                                            <button
                                                onClick={handleSaveProfile}
                                                disabled={isSaving || !editName.trim()}
                                                className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-2 rounded-md transition-colors disabled:bg-gray-300"
                                            >
                                                {isSaving ? '保存中...' : '保存する'}
                                            </button>
                                            <button
                                                onClick={handleEditToggle}
                                                className="border border-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-50 transition-colors"
                                            >
                                                キャンセル
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // 表示モード - 高さを狭くする
                        <div className="flex items-center py-2">
                            <div className="w-16 h-16 bg-gray-200 rounded-full overflow-hidden flex items-center justify-center text-gray-500 relative shrink-0">
                                {profile?.avatar_url ? (
                                    profile.avatar_url.startsWith('http') ? (
                                        // 外部URL（Google など）の場合はImageコンポーネント
                                        <Image 
                                            src={profile.avatar_url}
                                            alt={profile.name}
                                            width={64}
                                            height={64}
                                            className="object-cover"
                                            onError={(e) => {
                                                console.error('Avatar image failed to load:', profile.avatar_url);
                                                // エラー時のフォールバック処理
                                                const target = e.target as HTMLImageElement;
                                                target.style.display = 'none';
                                                // 親要素にフォールバックを表示
                                                if (target.parentElement) {
                                                    target.parentElement.innerHTML = `<span class="text-2xl">${profile?.name?.charAt(0).toUpperCase() || 'U'}</span>`;
                                                }
                                            }}
                                        />
                                    ) : (
                                        // Supabaseストレージの場合は通常のimgタグ
                                        <img 
                                            src={getPublicUrl('avatars', profile.avatar_url)}
                                            alt={profile.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                console.error('Avatar image failed to load:', profile.avatar_url);
                                                e.currentTarget.onerror = null;
                                                e.currentTarget.src = '';
                                                e.currentTarget.className = 'hidden';
                                                e.currentTarget.parentElement!.innerHTML = `<span class="text-2xl">${profile?.name?.charAt(0).toUpperCase() || 'U'}</span>`;
                                            }}
                                        />
                                    )
                                ) : (
                                    <span className="text-2xl">{profile?.name?.charAt(0).toUpperCase() || 'U'}</span>
                                )}
                            </div>

                            <div className="flex-1 ml-4 text-center md:text-left">
                                <div className="flex items-center">
                                    <h1 className="text-xl font-bold text-gray-800 mr-2">
                                        {profile?.name || user?.email?.split('@')[0] || 'ユーザー'}
                                    </h1>
                                    <button 
                                        onClick={handleEditToggle}
                                        className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                                        aria-label="ユーザー情報を編集"
                                        title="ユーザー情報を編集"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-600">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* アカウント削除確認ダイアログ */}
                {showDeleteConfirm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">アカウント削除の確認</h3>
                            <p className="text-gray-600 mb-6">
                                アカウントを削除すると、アップロードしたすべてのモデルも削除されます。この操作は取り消せません。
                            </p>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                >
                                    キャンセル
                                </button>
                                <button
                                    onClick={handleDeleteAccount}
                                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                                    disabled={isSaving}
                                >
                                    {isSaving ? '処理中...' : '削除する'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* アップロード済みモデル */}
                <div className="mb-12">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-800">アップロードしたモデル</h2>
                    </div>

                    {userModels.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {userModels.map((model) => (
                                <div key={model.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                                    <div className="aspect-square relative bg-gray-100 flex items-center justify-center">
                                        {model.thumbnail_url ? (
                                            <>
                                                <img
                                                    src={getPublicUrl('model_thumbnails', model.thumbnail_url)}
                                                    alt={model.title}
                                                    className="object-cover w-full h-full"
                                                    onError={(e) => {
                                                        console.error(`サムネイル読み込みエラー: ${model.thumbnail_url}`);
                                                        e.currentTarget.src = '/no-image.png';
                                                    }}
                                                />
                                            </>
                                        ) : (
                                            <span className="text-gray-400">サムネイルなし</span>
                                        )}
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-medium text-gray-800 mb-1">
                                            <Link href={`/models/${model.id}`} className="hover:text-pink-500">
                                                {model.title}
                                            </Link>
                                        </h3>
                                        <p className="text-gray-500 text-sm mb-3">
                                            {new Date(model.created_at).toLocaleDateString('ja-JP', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </p>
                                        <div className="flex gap-2">
                                            <Link
                                                href={`/models/edit/${model.id}`}
                                                className="text-sm text-blue-600 hover:text-blue-800"
                                            >
                                                編集
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow-md p-8 text-center">
                            <p className="text-gray-600 mb-4">まだモデルをアップロードしていません</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}