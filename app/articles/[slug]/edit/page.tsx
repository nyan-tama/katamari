'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getArticleBySlug, updateArticle, UpdateArticleInput } from '@/lib/api/articles';
import { createClientSupabase } from '@/lib/supabase-client';
import CustomFileSelector from '@/app/components/CustomFileSelector';
import { uploadFiles, filterSystemFiles, uploadHeroImage } from '@/app/components/ArticleEditor/fileUtils';
import HeroImageUploader from '@/app/components/ArticleEditor/HeroImageUploader';
import ActionButtons from '@/app/components/ArticleEditor/ActionButtons';

// 既存ファイルの型定義
interface DownloadFile {
    id: string;
    article_id: string;
    original_name: string;
    storage_path: string;
    path: string;
    file_size: number;
    file_type: string;
    storage_bucket: string;
    created_at: string;
}

export default function EditArticlePage({ params }: { params: { slug: string } }) {
    const router = useRouter();
    const articleSlug = params.slug;
    const [articleId, setArticleId] = useState('');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [heroImage, setHeroImage] = useState<File | null>(null);
    const [currentHeroImageUrl, setCurrentHeroImageUrl] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [existingFiles, setExistingFiles] = useState<DownloadFile[]>([]);
    const [articleStatus, setArticleStatus] = useState<'draft' | 'published'>('draft');
    const [filesError, setFilesError] = useState<string | null>(null);
    const [filesErrorType, setFilesErrorType] = useState<'error' | 'warning'>('error');
    const [filesToDelete, setFilesToDelete] = useState<string[]>([]);

    // ページロード時にユーザー情報と記事データを取得
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const supabase = createClientSupabase();

                // ユーザー情報を取得
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push('/login');
                    return;
                }
                setUserId(user.id);

                // 記事データを取得
                const article = await getArticleBySlug(articleSlug);
                setArticleId(article.id);

                // 記事が存在し、ログインユーザーが著者でない場合はリダイレクト
                if (article.author_id !== user.id) {
                    router.push(`/articles/${articleSlug}`);
                    return;
                }

                // 記事データをフォームにセット
                setTitle(article.title);
                setContent(article.content);
                setArticleStatus(article.status as 'draft' | 'published');

                // 記事に関連付けられたファイルを取得
                const { data: downloadFiles, error: filesError } = await supabase
                    .from('download_files')
                    .select('*')
                    .eq('article_id', article.id);

                if (filesError) {
                    console.error('ファイル取得エラー:', filesError);
                } else if (downloadFiles) {
                    setExistingFiles(downloadFiles);
                }

                // ヒーロー画像情報を取得
                if (article.hero_image_id) {
                    const { data: mediaData, error: mediaError } = await supabase
                        .from('article_media')
                        .select('*')
                        .eq('id', article.hero_image_id)
                        .single();

                    if (!mediaError && mediaData) {
                        // ストレージURLを取得
                        const { data } = supabase.storage
                            .from(mediaData.storage_bucket)
                            .getPublicUrl(mediaData.storage_path);

                        setCurrentHeroImageUrl(data.publicUrl);
                    }
                }
            } catch (err) {
                console.error('記事データ取得エラー:', err);
                setError('記事データの読み込みに失敗しました');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [articleSlug, router]);

    // 記事の更新
    const handleUpdate = async (saveStatus: 'draft' | 'published' = 'draft') => {
        if (!title) {
            setError('タイトルを入力してください');
            return;
        }

        if (!content) {
            setError('内容を入力してください');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            // 記事IDが無効な場合は更新できない
            if (!articleId || !userId) {
                setError('記事IDまたはユーザーIDが無効です');
                setIsSubmitting(false);
                return;
            }

            // ファイルのフィルタリング
            const { safeFiles, systemFolderFiles, detectedSystemFolder } = filterSystemFiles(selectedFiles);

            // システムフォルダが見つかった場合は警告を表示
            if (systemFolderFiles.length > 0) {
                setFilesError(`"${detectedSystemFolder}" を含むパスのファイル(${systemFolderFiles.length}件)はシステム関連フォルダのためアップロードできませんので除外しました`);
                setFilesErrorType('warning'); // 警告タイプに設定
            }

            // 画像アップロード処理
            let newHeroImageId = null;
            if (heroImage) {
                try {
                    newHeroImageId = await uploadHeroImage(articleId, heroImage);
                } catch (err) {
                    console.error('画像アップロードエラー:', err);
                    const errorMessage = err instanceof Error ? err.message : '不明なエラー';
                    setError(`画像のアップロードに失敗しました: ${errorMessage}`);
                    setIsSubmitting(false);
                    return;
                }
            }

            const supabase = createClientSupabase();

            // 記事の更新
            try {
                const updateData: UpdateArticleInput = {
                    title,
                    content,
                    status: saveStatus,
                };

                // ヒーロー画像IDがあれば追加
                if (newHeroImageId) {
                    // 記事テーブルの hero_image_id フィールドを直接更新
                    const { error: updateError } = await supabase
                        .from('articles')
                        .update({ hero_image_id: newHeroImageId })
                        .eq('id', articleId);

                    if (updateError) {
                        console.error('ヒーロー画像ID更新エラー:', updateError);
                    }
                }

                // 記事データを更新
                const updatedArticle = await updateArticle(articleId, updateData);
                console.log('記事更新成功:', updatedArticle);

                // 新しいファイルがあるか、削除対象のファイルがある場合に既存ファイルを処理
                const replaceExistingFiles = safeFiles.length > 0 || filesToDelete.length > 0;
                await uploadFiles(articleId, safeFiles, replaceExistingFiles, existingFiles, filesToDelete);

                // 成功したら記事詳細ページにリダイレクト
                router.push(`/articles/${articleSlug}`);
            } catch (err) {
                console.error('記事更新エラー:', err);
                setError('記事の更新に失敗しました');
            }
        } catch (err) {
            console.error('記事更新エラー:', err);
            setError('記事の更新に失敗しました');
        } finally {
            setIsSubmitting(false);
        }
    };

    // 下書き保存のハンドラ
    const handleSaveDraft = () => {
        handleUpdate('draft');
    };

    // 公開のハンドラ
    const handlePublish = () => {
        handleUpdate('published');
    };

    // キャンセルのハンドラ
    const handleCancel = () => {
        router.push(`/articles/${articleSlug}`);
    };

    // ヒーロー画像選択のハンドラ
    const handleHeroImageSelected = (file: File) => {
        setHeroImage(file);
    };

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="bg-white shadow rounded-lg p-6">
                    <div className="animate-pulse">
                        <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                        <div className="h-64 bg-gray-200 rounded mb-4"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6">記事を編集</h1>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            <div className="mb-6">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    タイトル
                </label>
                <input
                    type="text"
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md"
                    placeholder="記事のタイトルを入力..."
                />
            </div>

            {/* ヒーロー画像アップロード */}
            <HeroImageUploader
                currentImageUrl={currentHeroImageUrl}
                onImageSelected={handleHeroImageSelected}
                error={error}
            />

            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    記事内容
                </label>
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="記事の内容を入力してください..."
                    className="w-full p-3 border border-gray-300 rounded-md min-h-[300px]"
                    rows={10}
                />
            </div>

            {/* ダウンロードファイル */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    ダウンロードファイル
                </label>

                {/* ファイル選択UI - 既存ファイルを初期表示 */}
                <CustomFileSelector
                    onFilesSelected={(files) => setSelectedFiles(files)}
                    onFilesDeleted={(fileIds) => setFilesToDelete(fileIds)}
                    initialFiles={existingFiles}
                />
            </div>

            {/* アクションボタン */}
            <ActionButtons
                onCancel={handleCancel}
                onSaveDraft={handleSaveDraft}
                onPublish={handlePublish}
                isSubmitting={isSubmitting}
                articleStatus={articleStatus}
            />
        </div>
    );
} 