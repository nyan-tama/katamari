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
    const [existingFiles, setExistingFiles] = useState<any[]>([]);
    const [articleStatus, setArticleStatus] = useState<'draft' | 'published'>('draft');
    const [filesError, setFilesError] = useState<string | null>(null);
    const [filesErrorType, setFilesErrorType] = useState<'error' | 'warning'>('error');
    const [uploading, setUploading] = useState(false);

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
        try {
            setIsSubmitting(true);
            setError(null);
            setFilesError(null);

            // 記事IDが無効な場合は更新できない
            if (!articleId || !userId) {
                setError('記事情報が取得できません');
                setIsSubmitting(false);
                return;
            }

            // タイトルが空の場合はエラー
            if (!title.trim()) {
                setError('タイトルを入力してください');
                setIsSubmitting(false);
                return;
            }

            // システムフォルダのチェック（サブフォルダも含む）
            const systemFolders = ['.git', 'node_modules', '.svn', '.hg', '.vscode'];
            // システムファイルのリスト
            const systemFiles = ['.gitignore', 'HEAD', '.env', '.DS_Store', 'Thumbs.db', 'COMMIT_EDITMSG'];

            let systemFolderFiles: File[] = [];
            let detectedSystemFolder = '';

            // 問題のないファイルとシステムフォルダを含むファイルを分離
            const safeFiles = selectedFiles.filter(file => {
                // ファイル名だけでシステムファイルをチェック
                const fileName = file.name.toLowerCase();
                if (systemFiles.includes(fileName)) {
                    console.log(`システムファイル検出: ${fileName}`);
                    return false; // システムファイルはフィルタリング
                }

                // @ts-expect-error: webkitRelativePathはstandard DOMプロパティではない
                const relativePath = file.webkitRelativePath || '';
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

            if (!userId) {
                setError('ログインが必要です');
                setIsSubmitting(false);
                return;
            }

            const supabase = createClientSupabase();

            // ヒーロー画像のアップロード（新たに選択されていれば）
            let newHeroImageId = null;
            if (heroImage) {
                try {
                    // ファイル名のスペースをアンダースコアに置換し、特殊文字を除去
                    const sanitizedFileName = heroImage.name.replace(/\s+/g, '_').replace(/[^\w_.]/gi, '');
                    const filename = `${Date.now()}_${sanitizedFileName}`;
                    const storagePath = `${userId}/hero_images/${filename}`;

                    // 画像をアップロード
                    const { error: uploadError } = await supabase.storage
                        .from('article_media')
                        .upload(storagePath, heroImage, {
                            cacheControl: '3600',
                            upsert: false
                        });

                    if (uploadError) {
                        throw new Error(`画像アップロードエラー: ${uploadError.message}`);
                    }

                    // article_mediaテーブルに登録
                    const { data: mediaData, error: mediaError } = await supabase
                        .from('article_media')
                        .insert({
                            article_id: articleId,
                            media_type: 'image',
                            storage_bucket: 'article_media',
                            storage_path: storagePath,
                            media_role: 'hero'
                        })
                        .select();

                    if (mediaError) {
                        throw new Error(`ヒーロー画像情報の保存に失敗: ${mediaError.message}`);
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

                // 新しいファイルがあればアップロード
                if (selectedFiles.length > 0) {
                    await uploadFiles(articleId, safeFiles);
                }

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
        if (files.length === 0) return [];

        // アップロード中フラグをセット
        setUploading(true);

        try {
            // システムフォルダのチェック（サブフォルダも含む）
            const systemFolders = ['.git', 'node_modules', '.svn', '.hg', '.vscode'];
            // システムファイルのリスト
            const systemFiles = ['.gitignore', 'HEAD', '.env', '.DS_Store', 'Thumbs.db', 'COMMIT_EDITMSG'];

            let systemFolderFiles: File[] = [];
            let detectedSystemFolder = '';

            // 問題のないファイルとシステムフォルダを含むファイルを分離
            const safeFiles = files.filter(file => {
                // ファイル名だけでシステムファイルをチェック
                const fileName = file.name.toLowerCase();
                if (systemFiles.includes(fileName)) {
                    console.log(`システムファイル検出: ${fileName}`);
                    return false; // システムファイルはフィルタリング
                }

                // @ts-expect-error: webkitRelativePathはstandard DOMプロパティではない
                const relativePath = file.webkitRelativePath || '';
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

            // 安全なファイルがない場合は終了
            if (safeFiles.length === 0) {
                setFilesError('アップロードできるファイルがありません');
                setFilesErrorType('error'); // エラータイプに設定
                return [];
            }

            const supabase = createClientSupabase();
            const uploadedFiles = [];

            // UUIDの処理：1つ目のパート（8桁）と2つ目のパート（最初の4桁）を使用
            const uuidParts = articleId.split('-');
            const firstPart = uuidParts[0];           // 例: 39dab4d8
            const secondPart = uuidParts[1].substring(0, 4); // 例: f600 (f600から4文字)
            const parentFolderName = `3D-PRINTER-DOWNLOAD-DATA-${firstPart}-${secondPart}`;
            console.log('親フォルダ名:', parentFolderName);

            // フォルダアップロードかどうかを判定
            // @ts-expect-error: webkitRelativePathはstandard DOMプロパティではない
            const hasFolder = safeFiles.some(file => file.webkitRelativePath && file.webkitRelativePath.includes('/'));

            // フォルダアップロードの情報を取得
            let firstPath = '';
            if (hasFolder && safeFiles.length > 0) {
                // @ts-expect-error: webkitRelativePathはstandard DOMプロパティではない
                firstPath = safeFiles[0].webkitRelativePath || '';
            }

            // 各ファイルを処理
            for (const file of safeFiles) {
                try {
                    // 元のパス情報を取得
                    let originalPath = '';
                    let folderPath = '';

                    if (hasFolder) {
                        // @ts-expect-error: webkitRelativePathはstandard DOMプロパティではない
                        originalPath = file.webkitRelativePath || '';

                        // 元のパスを親フォルダ名＋元のパスに変換
                        // 例: abc/file.txt → 3D-PRINTER-DOWNLOAD-DATA-xxx/abc/file.txt
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
                        // 単一ファイルの場合は親フォルダ直下
                        originalPath = file.name;
                        folderPath = `${parentFolderName}`;
                    }

                    console.log('ファイル情報:', {
                        name: file.name,
                        originalPath,
                        folderPath
                    });

                    // 安全なストレージパスの生成（タイムスタンプ + ファイル名）
                    const timestamp = Date.now();
                    const safeFileName = encodeURIComponent(file.name);
                    const storagePath = `${articleId}/${timestamp}_${safeFileName}`;

                    // Supabaseストレージにアップロード
                    const { data, error: uploadError } = await supabase.storage
                        .from('downloads')
                        .upload(storagePath, file, {
                            cacheControl: '3600',
                            upsert: true
                        });

                    if (uploadError) {
                        console.error(`ファイル「${file.name}」のアップロードに失敗:`, uploadError);
                        continue; // 失敗しても次のファイルを試す
                    }

                    // download_filesテーブルにメタデータ保存
                    const { data: fileData, error: fileError } = await supabase
                        .from('download_files')
                        .insert({
                            article_id: articleId,
                            original_name: file.name,
                            path: `${folderPath}/`,             // ファイル名を含まないパス、末尾にスラッシュを追加
                            storage_path: storagePath,
                            file_size: file.size,
                            file_type: file.type || '',
                            mime_type: file.type || '',
                            storage_bucket: 'downloads'
                        })
                        .select()
                        .single();

                    if (fileError) {
                        console.error(`ファイル「${file.name}」のメタデータ保存に失敗:`, fileError);
                    } else if (fileData) {
                        uploadedFiles.push(fileData);
                    }
                } catch (fileErr) {
                    console.error(`ファイル「${file.name}」の処理中にエラー:`, fileErr);
                }
            }

            console.log('アップロード完了:', uploadedFiles);
            return uploadedFiles;
        } catch (error) {
            console.error('ファイルアップロードエラー:', error);
            throw error;
        } finally {
            // 処理完了時にアップロード中フラグを解除
            setUploading(false);
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

            {/* 既存のファイル一覧 */}
            {existingFiles.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">現在のファイル</h3>
                    <div className="bg-gray-50 rounded-lg p-4 border">
                        <ul className="divide-y">
                            {existingFiles.map(file => (
                                <li key={file.id} className="py-3 flex items-center justify-between">
                                    <div className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                        </svg>
                                        <span className="truncate max-w-md">{file.original_name}</span>
                                        <span className="ml-3 text-sm text-gray-500">{formatFileSize(file.file_size)}</span>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteFile(file.id)}
                                        className="ml-4 text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* 新しいファイルアップロード */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    ダウンロードファイルを追加
                </label>
                <CustomFileSelector
                    onFilesSelected={(files) => setSelectedFiles(files)}
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