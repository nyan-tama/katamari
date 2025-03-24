'use client';

import { UserProfile } from '@/app/types/profile';
import { getPublicUrl } from '@/lib/supabase-client';
import Image from 'next/image';

interface ProfileInfoProps {
    profile: UserProfile | null;
    isEditing: boolean;
    editName: string;
    avatarPreview: string | null;
    isSaving: boolean;
    handleEditToggle: () => void;
    handleAvatarButtonClick: (e: React.MouseEvent) => void;
    handleAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSaveProfile: () => void;
    setEditName: (name: string) => void;
}

export default function ProfileInfo({
    profile,
    isEditing,
    editName,
    avatarPreview,
    isSaving,
    handleEditToggle,
    handleAvatarButtonClick,
    handleAvatarChange,
    handleSaveProfile,
    setEditName
}: ProfileInfoProps) {
    if (!profile) return null;

    return (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                {/* プロフィール画像 */}
                <div className="flex-shrink-0">
                    {isEditing ? (
                        // 編集モード: 画像変更可能
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
                            <button
                                onClick={handleAvatarButtonClick}
                                className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-100 cursor-pointer transition-opacity"
                            >
                                <span className="text-white text-sm font-medium">変更</span>
                            </button>
                            <input
                                id="avatar-upload"
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarChange}
                                className="hidden"
                                tabIndex={-1}
                            />
                        </div>
                    ) : (
                        // 非編集モード: 画像表示のみ
                        <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-gray-200">
                            {profile?.avatar_storage_path ? (
                                <Image
                                    src={getPublicUrl('avatars', profile.avatar_storage_path)}
                                    alt={profile.name}
                                    width={128}
                                    height={128}
                                    className="object-cover w-full h-full"
                                    unoptimized={true}
                                />
                            ) : profile?.default_avatar_url && profile.default_avatar_url.startsWith('http') ? (
                                <Image
                                    src={profile.default_avatar_url}
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
    );
} 