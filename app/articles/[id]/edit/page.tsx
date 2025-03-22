'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getArticleById, updateArticle, UpdateArticleInput } from '@/lib/api/articles';
import { createClientSupabase } from '@/lib/supabase-client';
import CustomFileSelector from '@/app/components/CustomFileSelector';
import Image from 'next/image';

export default function EditArticlePage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const articleId = params.id;
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [heroImage, setHeroImage] = useState<File | null>(null);
    const [heroImagePreview, setHeroImagePreview] = useState<string | null>(null);
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
    const [uploading, setUploading] = useState(false);
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
                const article = await getArticleById(articleId);

                // 記事が存在し、ログインユーザーが著者でない場合はリダイレクト
                if (article.author_id !== user.id) {
                    router.push(`/articles/${articleId}`);
                    return;
                }

                // フォームに記事データをセット
                setTitle(article.title);
                setContent(article.content);
                setArticleStatus(article.status as 'draft' | 'published');

                // ヒーロー画像情報を取得
                if (article.hero_image_id) {
                    const { data: mediaData } = await supabase
                        .from('article_media')
                        .select('*')
                        .eq('id', article.hero_image_id)
                        .single();

                    if (mediaData) {
                        const { data } = supabase.storage
                            .from(mediaData.storage_bucket)
                            .getPublicUrl(mediaData.storage_path);

                        setCurrentHeroImageUrl(data.publicUrl);
                        setHeroImagePreview(data.publicUrl);
                    }
                }

                // 関連ファイルを取得
                const { data: files, error: filesError } = await supabase
                    .from('download_files')
                    .select('*')
                    .eq('article_id', articleId);

                if (filesError) {
                    console.error('ファイル情報の取得に失敗しました:', filesError);
                } else {
                    setExistingFiles(files || []);
                }

            } catch (err) {
                console.error('データ取得エラー:', err);
                setError('記事データの取得に失敗しました');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [articleId, router]);

    // ヒーロー画像の選択ハンドラ
    const handleHeroImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // ファイルタイプの検証
        if (!file.type.startsWith('image/')) {
            setError('画像ファイルのみアップロードできます');
            return;
        }

        // ファイルサイズの検証（5MB上限）
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            setError('画像サイズは5MB以下にしてください');
            return;
        }

        setHeroImage(file);
        const objectUrl = URL.createObjectURL(file);
        setHeroImagePreview(objectUrl);
        // エラーメッセージをクリア
        setError(null);
    };

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

            // システムフォルダのチェック（サブフォルダも含む）
            const systemFolders = ['.git', 'node_modules', '.svn', '.hg', '.vscode'];
            // システムファイルのリスト
            const systemFiles = ['.gitignore', 'HEAD', '.env', '.DS_Store', 'Thumbs.db', 'COMMIT_EDITMSG'];

            const systemFolderFiles: File[] = [];
            let detectedSystemFolder = '';

            // 問題のないファイルとシステムフォルダを含むファイルを分離
            const safeFiles = selectedFiles.filter(file => {
                // ファイル名だけでシステムファイルをチェック
                const fileName = file.name.toLowerCase();
                if (systemFiles.includes(fileName)) {
                    console.log(`システムファイル検出: ${fileName}`);
                    return false; // システムファイルはフィルタリング
                }

                const relativePath = (file as any).webkitRelativePath || '';
                if (relativePath && relativePath.includes('/')) {
                    const pathParts = relativePath.split('/');
                    for (const part of pathParts) {
                        if (systemFolders.includes(part)) {
                            // システムフォルダを検出した場合
                            if (!detectedSystemFolder) {
                                detectedSystemFolder = part;
                            }
                            systemFolderFiles.push(file);
                            return false; // このファイルはフィルタリング
                        }
                    }
                }
                return true; // 問題ないファイルは保持
            });

            // システムフォルダが見つかった場合は警告を表示
            if (systemFolderFiles.length > 0) {
                setFilesError(`"${detectedSystemFolder}" を含むパスのファイル(${systemFolderFiles.length}件)はシステム関連フォルダのためアップロードできませんので除外しました`);
                setFilesErrorType('warning'); // 警告タイプに設定
            }

            // 画像アップロード処理
            let newHeroImageId = null;
            if (heroImage) {
                try {
                    const supabase = createClientSupabase();
                    const timestamp = Date.now();
                    const fileName = heroImage.name.replace(/\s+/g, '-').toLowerCase();
                    const fileExt = fileName.split('.').pop();
                    const filePath = `${articleId}/${timestamp}_hero.${fileExt}`;

                    // ストレージにアップロード
                    const { error: uploadError } = await supabase.storage
                        .from('articles')
                        .upload(filePath, heroImage, {
                            cacheControl: '3600',
                            upsert: true
                        });

                    if (uploadError) {
                        throw new Error(`画像アップロードエラー: ${uploadError.message}`);
                    }

                    // メディア情報をDBに保存
                    const { data: mediaData, error: mediaError } = await supabase
                        .from('article_media')
                        .insert({
                            article_id: articleId,
                            file_name: fileName,
                            storage_path: filePath,
                            file_size: heroImage.size,
                            file_type: heroImage.type,
                            storage_bucket: 'articles',
                            media_type: 'hero',
                            width: 0,
                            height: 0
                        })
                        .select();

                    if (mediaError) {
                        throw new Error(`メディア情報保存エラー: ${mediaError.message}`);
                    }

                    if (mediaData && mediaData.length > 0) {
                        newHeroImageId = mediaData[0].id;
                    }
                } catch (err) {
                    console.error('画像アップロードエラー:', err);
                    const errorMessage = err instanceof Error ? err.message : '不明なエラー';
                    setError(`画像のアップロードに失敗しました: ${errorMessage}`);
                    setIsSubmitting(false);
                    return;
                }
            }

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

                // ファイル処理（新規アップロードまたは既存ファイル削除）
                await uploadFiles(articleId, safeFiles);

                // 成功したら記事詳細ページにリダイレクト
                router.push(`/articles/${articleId}`);
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

    // ファイルアップロード関数
    const uploadFiles = async (articleId: string, files: File[]) => {
        // アップロード中フラグをセット
        setUploading(true);

        try {
            const supabase = createClientSupabase();

            // 削除対象のファイルを処理
            if (filesToDelete.length > 0) {
                console.log('削除予定ファイルを削除します', filesToDelete);

                // 削除対象のファイルを抽出
                const filesToDeleteObj = existingFiles.filter(file => filesToDelete.includes(file.id));

                // 削除対象のストレージファイルを削除
                for (const file of filesToDeleteObj) {
                    try {
                        // ストレージからファイルを削除
                        const { error: storageError } = await supabase.storage
                            .from(file.storage_bucket)
                            .remove([file.storage_path]);

                        if (storageError) {
                            console.error(`ファイル「${file.original_name}」のストレージからの削除に失敗:`, storageError);
                        }
                    } catch (err) {
                        console.error(`ファイル「${file.original_name}」の削除中にエラー:`, err);
                    }
                }

                // データベースから削除対象のファイルを削除
                const { error: dbError } = await supabase
                    .from('download_files')
                    .delete()
                    .in('id', filesToDelete);

                if (dbError) {
                    console.error('削除対象ファイル情報の削除に失敗:', dbError);
                }
            }

            // 既存の残りのファイルを取得（削除対象外）
            const remainingExistingFiles = existingFiles.filter(file => !filesToDelete.includes(file.id));

            // 以前の既存ファイル削除処理は削除（削除対象のみを処理するようになったため）
            // 新しいファイルがない場合は終了
            if (files.length === 0) {
                // 削除のみで追加がない場合はexistingFilesを更新
                setFilesToDelete([]);
                setExistingFiles(remainingExistingFiles);
                return remainingExistingFiles;
            }

            const uploadedFiles = [];

            // UUIDの処理：1つ目のパート（8桁）と2つ目のパート（最初の4桁）を使用
            const uuidParts = articleId.split('-');
            const firstPart = uuidParts[0];           // 例: 39dab4d8
            const secondPart = uuidParts[1].substring(0, 4); // 例: f600 (f600から4文字)
            const parentFolderName = `3D-PRINTER-DOWNLOAD-DATA-${firstPart}-${secondPart}`;
            console.log('親フォルダ名:', parentFolderName);

            // フォルダアップロードのチェック
            const hasFolder = files.some(file => (file as any).webkitRelativePath);
            console.log('フォルダアップロードの有無:', hasFolder);

            // 複数ファイルの並行アップロード
            const uploadPromises = files.map(async (file) => {
                try {
                    let originalPath = '';
                    let folderPath = '';

                    // パスの処理: フォルダアップロードかファイルのみか
                    if (hasFolder) {
                        // フォルダアップロードの場合
                        // @ts-expect-error: webkitRelativePathはstandard DOMプロパティではない
                        if (hasFolder && (file as any).webkitRelativePath) {
                            // @ts-expect-error: webkitRelativePathはstandard DOMプロパティではない
                            originalPath = (file as any).webkitRelativePath;

                            // 元のパスからフォルダパスを抽出（ファイル名を除く）
                            const pathParts = originalPath.split('/');

                            // ファイル名を除いたパスを作成
                            if (pathParts.length > 1) {
                                // パスの最初の部分を親フォルダ名に置き換え
                                folderPath = `${parentFolderName}/${originalPath.substring(0, originalPath.lastIndexOf('/'))}`;
                            } else {
                                // 単一階層の場合は親フォルダ直下
                                folderPath = `${parentFolderName}`;
                            }
                        } else {
                            // フォルダアップロードだが、このファイルにwebkitRelativePathがない場合
                            folderPath = `${parentFolderName}`;
                            originalPath = file.name;
                        }
                    } else {
                        // 通常のファイルアップロードの場合
                        folderPath = `${parentFolderName}`;
                        originalPath = file.name;
                    }

                    console.log(`ファイルアップロード: 元のパス=${originalPath}, 保存先フォルダ=${folderPath}`);

                    // 安全なストレージパスの生成（タイムスタンプ + ファイル名）
                    const timestamp = Date.now();
                    const safeFileName = encodeURIComponent(file.name);
                    const storagePath = `${articleId}/${timestamp}_${safeFileName}`;

                    console.log(`最終ストレージパス: ${storagePath}`);

                    // ストレージにアップロード
                    const { data: storageData, error: storageError } = await supabase.storage
                        .from('downloads')
                        .upload(storagePath, file, {
                            cacheControl: '3600',
                            upsert: true
                        });

                    if (storageError) {
                        console.error(`ファイル「${originalPath}」のアップロードに失敗:`, storageError);
                        return null;
                    }

                    // アップロードがうまくいった場合、データベースに情報を保存
                    const { data: fileData, error: dbError } = await supabase
                        .from('download_files')
                        .insert({
                            article_id: articleId,
                            storage_bucket: 'downloads',
                            storage_path: storagePath,
                            original_name: file.name,
                            path: `${folderPath}/`,  // 末尾にスラッシュを追加
                            file_size: file.size,
                            file_type: file.type,
                            mime_type: file.type || ''
                        })
                        .select();

                    if (dbError) {
                        console.error(`ファイル「${originalPath}」の情報保存に失敗:`, dbError);
                        return null;
                    }

                    return fileData[0] || null;
                } catch (err) {
                    console.error(`ファイル「${file.name}」の処理中にエラー:`, err);
                    return null;
                }
            });

            try {
                const results = await Promise.all(uploadPromises);
                // nullをフィルタリングして成功したアップロードのみを取得
                const successfulUploads = results.filter(result => result !== null);
                console.log(`${successfulUploads.length}/${files.length} ファイルのアップロードに成功`);

                // 成功したアップロードがあれば選択ファイルリストを更新
                if (successfulUploads.length > 0) {
                    setSelectedFiles([]);
                }

                // 残りの既存ファイルとアップロードしたファイルを統合
                const combinedFiles = [...remainingExistingFiles, ...successfulUploads.filter(Boolean)];

                // 既存ファイル情報を更新
                setExistingFiles(combinedFiles);
                setFilesToDelete([]); // 削除リストをクリア

                // 成功したファイルのみを返す
                return combinedFiles;
            } catch (err) {
                console.error('ファイルアップロード中にエラーが発生しました:', err);
                return [];
            } finally {
                setUploading(false);
            }
        } catch (err) {
            console.error('ファイルアップロード処理中にエラーが発生しました:', err);
            setUploading(false);
            return [];
        }
    };

    // ファイルの削除
    const handleDeleteFile = async (fileId: string) => {
        if (!confirm('このファイルを削除してもよろしいですか？')) {
            return;
        }

        try {
            const supabase = createClientSupabase();

            // まずファイル情報を取得
            const { data: fileData, error: fetchError } = await supabase
                .from('download_files')
                .select('*')
                .eq('id', fileId)
                .single();

            if (fetchError || !fileData) {
                throw new Error('ファイル情報の取得に失敗しました');
            }

            // ストレージからファイルを削除
            const { error: storageError } = await supabase.storage
                .from(fileData.storage_bucket)
                .remove([fileData.storage_path]);

            if (storageError) {
                console.error('ストレージからのファイル削除に失敗:', storageError);
            }

            // データベースからファイル情報を削除
            const { error: dbError } = await supabase
                .from('download_files')
                .delete()
                .eq('id', fileId);

            if (dbError) {
                throw new Error('ファイル情報の削除に失敗しました');
            }

            // 成功したら既存ファイルリストを更新
            setExistingFiles(existingFiles.filter(file => file.id !== fileId));

        } catch (err) {
            console.error('ファイル削除エラー:', err);
            setError('ファイルの削除に失敗しました');
        }
    };

    // ファイルサイズのフォーマット
    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // ローディング中表示
    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <p className="text-center">記事データを読み込み中...</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6">記事を編集</h1>

            {error && (
                <div className="bg-red-100 border-2 border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">エラー</span>
                    </div>
                    <div className="mt-1 whitespace-pre-line">{error}</div>
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

            <div className="mb-6">
                <label htmlFor="heroImage" className="block text-sm font-medium text-gray-700 mb-1">
                    ヒーロー画像
                </label>

                {currentHeroImageUrl && !heroImage && (
                    <div className="mb-3">
                        <p className="text-sm text-gray-600 mb-2">現在の画像:</p>
                        <Image
                            src={currentHeroImageUrl}
                            alt="現在のヒーロー画像"
                            width={400}
                            height={225}
                            className="max-h-64 object-cover rounded-md"
                            unoptimized={true}
                        />
                    </div>
                )}

                <input
                    type="file"
                    id="heroImage"
                    accept="image/*"
                    onChange={handleHeroImageChange}
                    className="w-full"
                />

                {heroImage && heroImagePreview && (
                    <div className="mt-2">
                        <p className="text-sm text-gray-600 mb-2">新しい画像:</p>
                        <img
                            src={heroImagePreview}
                            alt="ヒーロー画像プレビュー"
                            className="max-h-64 object-cover rounded-md"
                        />
                    </div>
                )}
            </div>

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

            <div className="flex justify-between">
                <button
                    type="button"
                    onClick={() => router.push(`/articles/${articleId}`)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                    キャンセル
                </button>

                <div className="flex gap-4">
                    <button
                        type="button"
                        onClick={() => handleUpdate('draft')}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                    >
                        下書き保存
                    </button>
                    <button
                        type="button"
                        onClick={() => handleUpdate('published')}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {articleStatus === 'published' ? '更新する' : '公開する'}
                    </button>
                </div>
            </div>
        </div>
    );
} 