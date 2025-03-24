'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getArticleById, updateArticle, UpdateArticleInput } from '@/lib/api/articles';
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
    const [articleId, setArticleId] = useState<string>('');
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

                // slugから記事を取得
                const { data: article, error: articleError } = await supabase
                    .from('articles')
                    .select('*')
                    .eq('slug', articleSlug)
                    .single();

                if (articleError || !article) {
                    console.error('記事の取得に失敗しました:', articleError);
                    setError('記事の取得に失敗しました');
                    return;
                }

                // 記事の編集権限をチェック
                if (article.author_id !== user.id) {
                    router.push(`/articles/${articleSlug}`);
                    return;
                }

                // 記事データをセット
                setArticleId(article.id);
                setTitle(article.title);
                setContent(article.content);
                setArticleStatus(article.status);

                // ヒーロー画像URLの取得
                if (article.hero_image_id) {
                    const { data: mediaData, error: mediaError } = await supabase
                        .from('article_media')
                        .select('*')
                        .eq('id', article.hero_image_id)
                        .single();

                    if (!mediaError && mediaData) {
                        const { data: imageData } = supabase.storage
                            .from(mediaData.storage_bucket)
                            .getPublicUrl(mediaData.storage_path);

                        setCurrentHeroImageUrl(imageData.publicUrl);
                    }
                }

                // 記事に添付されたファイルを取得
                const { data: downloadFiles, error: filesError } = await supabase
                    .from('download_files')
                    .select('*')
                    .eq('article_id', article.id);

                if (!filesError && downloadFiles) {
                    setExistingFiles(downloadFiles);
                }
            } catch (err) {
                console.error('データの取得中にエラーが発生しました:', err);
                setError('データの取得中にエラーが発生しました');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [articleSlug, router]);

    // 記事の更新
    const handleUpdate = async (saveStatus: 'draft' | 'published' = 'draft') => {
        try {
            setIsSubmitting(true);
            setError(null);
            
            if (!title.trim()) {
                setError('タイトルを入力してください');
                setIsSubmitting(false);
                return;
            }

            if (!userId || !articleId) {
                setError('ログインが必要です');
                setIsSubmitting(false);
                return;
            }

            // 記事データの準備
            const articleData: UpdateArticleInput = {
                title,
                content,
                status: saveStatus
            };

            // 記事を更新
            const updatedArticle = await updateArticle(articleId, articleData);

            // ヒーロー画像のアップロード（もし選択されていれば）
            if (heroImage) {
                const heroImageId = await uploadHeroImage(articleId, heroImage);
                
                if (heroImageId) {
                    // 記事にヒーロー画像IDを関連付け
                    const supabase = createClientSupabase();
                    await supabase
                        .from('articles')
                        .update({ hero_image_id: heroImageId })
                        .eq('id', articleId);
                }
            }

            // ファイルの削除処理（選択されたファイルを削除）
            if (filesToDelete.length > 0) {
                const supabase = createClientSupabase();
                
                // DBからファイル情報を削除
                const { error: deleteError } = await supabase
                    .from('download_files')
                    .delete()
                    .in('id', filesToDelete);

                if (deleteError) {
                    console.error('ファイルの削除に失敗しました:', deleteError);
                } else {
                    console.log(`${filesToDelete.length}件のファイルを削除しました`);
                }
                
                // ストレージの対象ファイルも削除
                for (const fileId of filesToDelete) {
                    const fileToDelete = existingFiles.find(f => f.id === fileId);
                    if (fileToDelete && fileToDelete.storage_path) {
                        const { error: storageError } = await supabase.storage
                            .from(fileToDelete.storage_bucket || 'downloads')
                            .remove([fileToDelete.storage_path]);
                            
                        if (storageError) {
                            console.error(`ストレージファイル「${fileToDelete.storage_path}」の削除エラー:`, storageError);
                        }
                    }
                }
            }

            // 新しいファイルのアップロード
            if (selectedFiles.length > 0) {
                await uploadFiles(articleId, selectedFiles);
            }

            // 記事詳細ページにリダイレクト
            router.push(`/articles/${updatedArticle.slug}`);
        } catch (err) {
            console.error('記事の更新中にエラーが発生しました:', err);
            setError('記事の更新中にエラーが発生しました');
        } finally {
            setIsSubmitting(false);
        }
    };

    // 下書き保存
    const handleSaveDraft = () => {
        handleUpdate('draft');
    };

    // 公開
    const handlePublish = () => {
        handleUpdate('published');
    };

    // キャンセル
    const handleCancel = () => {
        router.push(`/articles/${articleSlug}`);
    };

    // ヒーロー画像の選択ハンドラ
    const handleHeroImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setHeroImage(file);
        }
    };

    // 読み込み中表示
    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <p className="text-center">読み込み中...</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6">記事を編集</h1>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {filesError && (
                <div className={`${filesErrorType === 'error' 
                  ? 'bg-red-100 border-2 border-red-400 text-red-700' 
                  : 'bg-yellow-100 border-2 border-yellow-400 text-yellow-700'} px-4 py-3 rounded mb-4`}>
                    <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">{filesErrorType === 'error' ? 'ファイルエラー' : '注意'}</span>
                    </div>
                    <div className="mt-1 whitespace-pre-line">{filesError}</div>
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="記事のタイトルを入力してください"
                />
            </div>

            <HeroImageUploader
                currentImageUrl={currentHeroImageUrl}
                onImageSelected={handleHeroImageSelected}
                error={error}
            />

            <div className="mb-6">
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                    記事内容
                </label>
                <textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md min-h-[300px]"
                    placeholder="記事の内容を入力してください..."
                    rows={10}
                />
            </div>

            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    ダウンロードファイル
                </label>
                <CustomFileSelector
                    onFilesSelected={(files: File[]) => setSelectedFiles(files)}
                    onFilesDeleted={(fileIds: string[]) => setFilesToDelete(fileIds)}
                    initialFiles={existingFiles}
                />
            </div>

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