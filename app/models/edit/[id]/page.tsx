'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClientSupabase, getPublicUrl } from '@/lib/supabase-client';
import Link from 'next/link';

interface Model {
    id: string;
    title: string;
    description: string | null;
    thumbnail_url: string | null;
    file_url: string;
    user_id: string;
}

export default function EditModelPage() {
    const params = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [model, setModel] = useState<Model | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

    useEffect(() => {
        const fetchModel = async () => {
            try {
                setLoading(true);
                const supabase = createClientSupabase();
                const modelId = params.id as string;

                // 現在のユーザー情報を取得
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.user) {
                    router.push('/login');
                    return;
                }

                // モデルデータを取得
                const { data: modelData, error: modelError } = await supabase
                    .from('models')
                    .select('*')
                    .eq('id', modelId)
                    .single();

                if (modelError) throw modelError;
                if (!modelData) {
                    router.push('/profile');
                    return;
                }

                // 自分のモデルかチェック
                if (modelData.user_id !== session.user.id) {
                    alert('このモデルを編集する権限がありません');
                    router.push('/profile');
                    return;
                }

                setModel(modelData);
                setTitle(modelData.title);
                setDescription(modelData.description || '');

                // サムネイル画像のプレビューURLを設定
                if (modelData.thumbnail_url) {
                    setThumbnailPreview(getPublicUrl('model_thumbnails', modelData.thumbnail_url));
                }
            } catch (error) {
                console.error('Error fetching model:', error);
                alert('モデルの読み込み中にエラーが発生しました');
                router.push('/profile');
            } finally {
                setLoading(false);
            }
        };

        if (params.id) {
            fetchModel();
        }
    }, [params.id, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title || !model) {
            alert('タイトルは必須です');
            return;
        }

        try {
            setSaving(true);
            const supabase = createClientSupabase();
            let thumbnailPath = model.thumbnail_url;

            // 新しいサムネイルがアップロードされた場合
            if (thumbnailFile) {
                // 古いサムネイルがある場合は削除
                if (model.thumbnail_url) {
                    await supabase.storage
                        .from('model_thumbnails')
                        .remove([model.thumbnail_url]);
                }

                // 新しいサムネイルをアップロード
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error('認証セッションが見つかりません');

                const thumbnailExt = thumbnailFile.name.split('.').pop();
                thumbnailPath = `${session.user.id}/${Date.now()}_thumbnail.${thumbnailExt}`;

                const { error: thumbnailUploadError } = await supabase.storage
                    .from('model_thumbnails')
                    .upload(thumbnailPath, thumbnailFile, {
                        upsert: true,
                        cacheControl: '3600'
                    });

                if (thumbnailUploadError) throw thumbnailUploadError;
            }

            // モデルデータを更新
            const { error: updateError } = await supabase
                .from('models')
                .update({
                    title,
                    description: description || null,
                    thumbnail_url: thumbnailPath,
                    updated_at: new Date().toISOString()
                })
                .eq('id', model.id);

            if (updateError) throw updateError;

            alert('モデル情報が更新されました');
            router.push(`/models/${model.id}`);
        } catch (error) {
            console.error('Error updating model:', error);
            let errorMessage = '不明なエラーが発生しました';
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            alert(`モデルの更新中にエラーが発生しました: ${errorMessage}`);
        } finally {
            setSaving(false);
        }
    };

    // モデル削除処理
    const handleDeleteModel = async () => {
        if (!model) return;

        if (!confirm('このモデルを削除してもよろしいですか？この操作は元に戻せません。')) {
            return;
        }

        try {
            setDeleting(true);
            const supabase = createClientSupabase();

            // ストレージからモデルファイルを削除
            const { error: fileDeleteError } = await supabase.storage
                .from('model_files')
                .remove([model.file_url]);

            if (fileDeleteError) console.error('Error deleting model file:', fileDeleteError);

            // サムネイルがある場合は削除
            if (model.thumbnail_url) {
                const { error: thumbnailDeleteError } = await supabase.storage
                    .from('model_thumbnails')
                    .remove([model.thumbnail_url]);

                if (thumbnailDeleteError) console.error('Error deleting thumbnail:', thumbnailDeleteError);
            }

            // データベースからモデルを削除
            const { error: deleteError } = await supabase
                .from('models')
                .delete()
                .eq('id', model.id);

            if (deleteError) throw deleteError;

            alert('モデルを削除しました');
            router.push('/profile');
        } catch (error) {
            console.error('Error deleting model:', error);
            let errorMessage = '不明なエラーが発生しました';
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            alert(`モデルの削除中にエラーが発生しました: ${errorMessage}`);
        } finally {
            setDeleting(false);
        }
    };

    // サムネイルのプレビュー表示を更新
    const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setThumbnailFile(file);

        // プレビュー用のURLを作成
        const reader = new FileReader();
        reader.onloadend = () => {
            setThumbnailPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    // サムネイルの削除
    const handleRemoveThumbnail = () => {
        setThumbnailFile(null);
        setThumbnailPreview(null);
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

    if (!model) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center py-12">
                    <h1 className="text-2xl font-bold text-gray-800 mb-4">モデルが見つかりません</h1>
                    <p className="text-gray-600 mb-6">お探しのモデルは存在しないか、削除された可能性があります。</p>
                    <Link href="/profile" className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-md transition-colors">
                        プロフィールに戻る
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">モデル情報の編集</h1>

                <div className="bg-white rounded-lg shadow-md p-6">
                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label htmlFor="title" className="block text-gray-700 font-medium mb-2">
                                タイトル <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                                required
                            />
                        </div>

                        <div className="mb-4">
                            <label htmlFor="description" className="block text-gray-700 font-medium mb-2">
                                説明
                            </label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 h-32"
                            />
                        </div>

                        <div className="mb-6">
                            <label className="block text-gray-700 font-medium mb-2">
                                サムネイル画像
                            </label>

                            {thumbnailPreview ? (
                                <div className="mb-3">
                                    <div className="relative w-48 h-48 mb-2 border border-gray-200 rounded overflow-hidden">
                                        <img
                                            src={thumbnailPreview}
                                            alt="サムネイルプレビュー"
                                            className="object-cover w-full h-full"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleRemoveThumbnail}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                                            title="削除"
                                        >
                                            ×
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="mb-3">
                                    <input
                                        type="file"
                                        id="thumbnailFile"
                                        accept="image/*"
                                        onChange={handleThumbnailChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                                    />
                                    <p className="text-sm text-gray-500 mt-1">
                                        推奨サイズ: 800x800px、最大: 5MB
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between">
                            <Link
                                href={`/models/${model.id}`}
                                className="text-gray-600 px-6 py-3"
                            >
                                キャンセル
                            </Link>
                            <button
                                type="submit"
                                disabled={saving}
                                className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-md font-medium transition-colors disabled:bg-pink-300"
                            >
                                {saving ? '保存中...' : '保存'}
                            </button>
                        </div>
                    </form>

                    {/* 削除セクション */}
                    <div className="mt-12 pt-6 border-t border-gray-200">
                        <h3 className="text-lg font-medium text-red-600">危険な操作</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            このモデルを削除すると、元に戻すことはできません。すべての関連データも削除されます。
                        </p>
                        <button
                            onClick={handleDeleteModel}
                            disabled={deleting}
                            className="mt-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md disabled:bg-red-300"
                        >
                            {deleting ? '削除中...' : 'このモデルを削除'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
} 