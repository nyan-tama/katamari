'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TipTapEditor from '../../../components/Editor/TipTapEditor';
import { getArticleById, updateArticle, UpdateArticleInput } from '../../../../lib/api/articles';
import { createClientSupabase } from '@/lib/supabase-client';

export default function EditArticlePage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const articleId = params.id;

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [heroImage, setHeroImage] = useState<File | null>(null);
    const [heroImagePreview, setHeroImagePreview] = useState<string | null>(null);
    const [currentHeroImageUrl, setCurrentHeroImageUrl] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [notAuthorized, setNotAuthorized] = useState(false);

    // ページロード時にユーザー情報と記事データを取得
    useEffect(() => {
        const init = async () => {
            setIsLoading(true);

            try {
                const supabase = createClientSupabase();
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    // ログインしていない場合はログインページへリダイレクト
                    router.push('/login');
                    return;
                }

                setUserId(user.id);

                // 記事データの取得
                try {
                    const article = await getArticleById(articleId);

                    // 記事の著者か確認
                    if (article.author_id !== user.id) {
                        setNotAuthorized(true);
                        return;
                    }

                    // 記事データをフォームにセット
                    setTitle(article.title);
                    setContent(article.content);

                    // ヒーロー画像があれば取得
                    if (article.hero_image_id) {
                        const { data: mediaData } = await supabase
                            .from('article_media')
                            .select('*')
                            .eq('id', article.hero_image_id)
                            .single();

                        if (mediaData) {
                            // ストレージパスを適切にエンコード
                            const encodedPath = mediaData.storage_path
                                .split('/')
                                .map((segment: string) => encodeURIComponent(segment))
                                .join('/');

                            const { data } = supabase.storage
                                .from(mediaData.storage_bucket)
                                .getPublicUrl(encodedPath);

                            setCurrentHeroImageUrl(data.publicUrl);
                            setHeroImagePreview(data.publicUrl);
                        }
                    }
                } catch (err) {
                    console.error('記事取得エラー:', err);
                    setNotFound(true);
                }
            } catch (err) {
                console.error('初期化エラー:', err);
                setError('ページの読み込みに失敗しました');
            } finally {
                setIsLoading(false);
            }
        };

        init();
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

    // 記事の保存
    const handleSave = async (saveStatus: 'draft' | 'published' = 'draft') => {
        try {
            setIsSubmitting(true);
            setError(null);

            if (!title.trim()) {
                setError('タイトルを入力してください');
                setIsSubmitting(false);
                return;
            }

            if (!userId) {
                setError('ログインが必要です');
                setIsSubmitting(false);
                return;
            }

            const supabase = createClientSupabase();

            // ヒーロー画像のアップロード（新しい画像が選択されていれば）
            let heroImageUrl = null;
            if (heroImage) {
                try {
                    // ファイル名のスペースをアンダースコアに置換し、特殊文字を除去
                    const sanitizedFileName = heroImage.name.replace(/\s+/g, '_').replace(/[^\w_.]/gi, '');
                    const filename = `${Date.now()}_${sanitizedFileName}`;

                    console.log('ストレージアップロード開始:', {
                        bucket: 'article_media',
                        path: `${userId}/hero_images/${filename}`,
                        fileSize: heroImage.size,
                        fileType: heroImage.type
                    });

                    const { error: uploadError } = await supabase.storage
                        .from('article_media')
                        .upload(`${userId}/hero_images/${filename}`, heroImage, {
                            cacheControl: '3600',
                            upsert: false
                        });

                    if (uploadError) {
                        console.error('画像アップロードエラー:', uploadError);
                        setError(`画像のアップロードに失敗しました: ${uploadError.message}`);
                        setIsSubmitting(false);
                        return;
                    }

                    // 公開URLを取得
                    const { data } = supabase.storage
                        .from('article_media')
                        .getPublicUrl(`${userId}/hero_images/${filename}`);

                    heroImageUrl = data.publicUrl;
                    console.log('画像アップロード成功:', heroImageUrl);
                } catch (uploadErr: unknown) {
                    console.error('画像アップロード例外:', uploadErr);
                    const errorMessage = uploadErr instanceof Error
                        ? uploadErr.message
                        : typeof uploadErr === 'object' && uploadErr && 'message' in uploadErr
                            ? String(uploadErr.message)
                            : '不明なエラー';
                    setError(`画像のアップロードに失敗しました: ${errorMessage}`);
                    setIsSubmitting(false);
                    return;
                }
            }

            // 記事の更新
            try {
                console.log('記事更新開始:', {
                    title: title.length,
                    content: content.length > 100 ? content.substring(0, 100) + '...' : content,
                    status: saveStatus
                });

                // 更新データを準備
                const articleData: UpdateArticleInput = {
                    title,
                    content,
                    status: saveStatus,
                };

                // 公開状態の場合は公開日時を設定（まだ設定されていない場合）
                if (saveStatus === 'published') {
                    articleData.published_at = new Date().toISOString();
                }

                const article = await updateArticle(articleId, articleData);

                // 新しいヒーロー画像がアップロードされた場合、article_mediaに追加
                if (heroImageUrl) {
                    try {
                        // まず既存のヒーロー画像のレコードを削除
                        const { error: deleteError } = await supabase
                            .from('article_media')
                            .delete()
                            .eq('article_id', article.id)
                            .eq('media_role', 'hero');

                        if (deleteError) {
                            console.error('既存のヒーロー画像レコードの削除に失敗しました:', deleteError);
                        }

                        // article_mediaテーブルにヒーロー画像の情報を追加
                        const { data: mediaData, error: mediaError } = await supabase.from('article_media').insert({
                            article_id: article.id,
                            media_type: 'image',
                            storage_bucket: 'article_media',
                            storage_path: `${userId}/hero_images/${heroImageUrl.split('/').pop()}`,
                            media_role: 'hero'
                        }).select();

                        if (mediaError) {
                            console.error('ヒーロー画像情報の保存に失敗しました:', mediaError);
                        } else if (mediaData && mediaData.length > 0) {
                            // ヒーロー画像IDを記事に関連付け
                            const { error: updateError } = await supabase
                                .from('articles')
                                .update({ hero_image_id: mediaData[0].id })
                                .eq('id', article.id);

                            if (updateError) {
                                console.error('記事のヒーロー画像ID更新に失敗しました:', updateError);
                            }
                        }
                    } catch (err) {
                        console.error('ヒーロー画像情報の保存に失敗しました:', err);
                        // ヒーロー画像情報の保存失敗は致命的エラーではないので続行
                    }
                }

                console.log('記事更新成功:', article);

                // 成功したら記事詳細ページにリダイレクト
                router.push(`/articles/${article.id}`);
            } catch (err) {
                console.error('記事更新エラー（詳細）:', JSON.stringify(err));
                setError('記事の更新に失敗しました');
                setIsSubmitting(false);
            }
        } catch (err) {
            console.error('記事更新エラー:', err);
            setError('記事の更新に失敗しました');
        } finally {
            setIsSubmitting(false);
        }
    };

    // 記事削除処理
    const handleDelete = async () => {
        if (!confirm('本当にこの記事を削除しますか？この操作は元に戻せません。')) {
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);

            const supabase = createClientSupabase();

            // 記事を削除
            const { error } = await supabase
                .from('articles')
                .delete()
                .eq('id', articleId)
                .eq('author_id', userId); // 念のため著者のみ削除可能に

            if (error) {
                console.error('記事削除エラー:', error);
                setError('記事の削除に失敗しました');
                setIsSubmitting(false);
                return;
            }

            console.log('記事削除成功');

            // 成功したら記事一覧ページにリダイレクト
            router.push('/articles');
        } catch (err) {
            console.error('記事削除エラー:', err);
            setError('記事の削除に失敗しました');
            setIsSubmitting(false);
        }
    };

    // 読み込み中
    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <p className="text-center">記事データを読み込み中...</p>
            </div>
        );
    }

    // 記事が見つからない場合
    if (notFound) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    記事が見つかりませんでした。
                </div>
                <button
                    onClick={() => router.push('/articles')}
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                    記事一覧に戻る
                </button>
            </div>
        );
    }

    // 権限がない場合
    if (notAuthorized) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    この記事を編集する権限がありません。
                </div>
                <button
                    onClick={() => router.push(`/articles/${articleId}`)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                    記事に戻る
                </button>
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
                {heroImagePreview && (
                    <div className="mt-2 mb-4">
                        <p className="text-sm text-gray-500 mb-2">現在の画像:</p>
                        <img
                            src={heroImagePreview}
                            alt="ヒーロー画像プレビュー"
                            className="w-full max-h-64 object-cover rounded-md"
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
                <p className="text-sm text-gray-500 mt-1">新しい画像を選択すると、現在の画像が置き換えられます</p>
            </div>

            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    記事内容
                </label>
                <TipTapEditor
                    content={content}
                    onChange={setContent}
                    placeholder="記事の内容を入力してください..."
                />
            </div>

            <div className="flex justify-between">
                <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                    削除
                </button>

                <div className="flex gap-4">
                    <button
                        type="button"
                        onClick={() => handleSave('draft')}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                    >
                        非公開で保存
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSave('published')}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                    >
                        公開する
                    </button>
                </div>
            </div>
        </div>
    );
} 