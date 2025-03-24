'use client';

import useProfile from '@/app/hooks/useProfile';
import ProfileInfo from '@/app/components/Profile/ProfileInfo';
import ArticleList from '@/app/components/Profile/ArticleList';

export default function ProfilePage() {
    const {
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
        setEditName,
    } = useProfile();

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
                <ProfileInfo
                    profile={profile}
                    isEditing={isEditing}
                    editName={editName}
                    avatarPreview={avatarPreview}
                    isSaving={isSaving}
                    handleEditToggle={handleEditToggle}
                    handleAvatarButtonClick={handleAvatarButtonClick}
                    handleAvatarChange={handleAvatarChange}
                    handleSaveProfile={handleSaveProfile}
                    setEditName={setEditName}
                />

                {/* タブナビゲーション */}
                <div className="border-b border-gray-200 mb-8">
                    <nav className="-mb-px flex">
                        <button className="text-pink-600 border-pink-500 py-4 px-1 border-b-2 font-medium mr-8">
                            記事
                        </button>
                    </nav>
                </div>

                {/* 記事一覧 */}
                <ArticleList articles={userArticles} />
            </div>
        </div>
    );
}