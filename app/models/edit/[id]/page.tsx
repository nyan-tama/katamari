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

        // モデルIDの検証
        if (!model.id || typeof model.id !== 'string' || model.id.trim() === '') {
            console.error('無効なモデルID:', model.id);
            alert('無効なモデルIDです。ページを再読み込みしてお試しください。');
            return;
        }

        try {
            setSaving(true);
            const supabase = createClientSupabase();

            // まず、モデルが存在するか確認
            console.log('モデル存在確認を実行します。ID:', model.id);
            const { data: existingModel, error: checkError } = await supabase
                .from('models')
                .select('id, title, thumbnail_url')
                .eq('id', model.id)
                .maybeSingle();

            if (checkError) {
                console.error('モデル確認エラー:', checkError);
                throw new Error(`モデル確認中にエラーが発生しました: ${checkError.message}`);
            }

            if (!existingModel) {
                console.error('モデルが存在しません。ID:', model.id);
                // 認証情報をチェック
                const { data: { session } } = await supabase.auth.getSession();
                console.log('現在のユーザーID:', session?.user?.id);
                console.log('モデルのユーザーID (メモリ上):', model.user_id);
                throw new Error('モデルが見つかりません。削除されたか、アクセス権限がない可能性があります。');
            }

            console.log('モデルが見つかりました:', existingModel);

            // サムネイルパスを取得
            let thumbnailPath = model.thumbnail_url;
            console.log('現在のサムネイルパス:', thumbnailPath);

            // 新しいサムネイルがアップロードされた場合
            if (thumbnailFile) {
                // 古いサムネイルがある場合は削除
                if (thumbnailPath) {
                    console.log('古いサムネイルを削除します:', thumbnailPath);
                    const { error: removeError } = await supabase.storage
                        .from('model_thumbnails')
                        .remove([thumbnailPath]);

                    if (removeError) {
                        console.error('古いサムネイル削除エラー:', removeError);
                    }
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
            } else if (thumbnailPreview === null && existingModel.thumbnail_url) {
                // サムネイルが削除された場合（プレビューがnullで、元のモデルにはサムネイルがあった）
                console.log('サムネイルが削除されました。ストレージからも削除します:', existingModel.thumbnail_url);

                // 重要: 先にストレージからファイルを削除し、その後でデータベースの参照を更新する
                // これにより、データの整合性が保たれる（孤立ファイルの発生防止）
                try {
                    const { error: removeError } = await supabase.storage
                        .from('model_thumbnails')
                        .remove([existingModel.thumbnail_url]);

                    if (removeError) {
                        console.error('サムネイル削除エラー:', removeError);
                        // エラーが発生しても処理を続行（ファイルが存在しない可能性もある）
                    } else {
                        console.log('ストレージからサムネイルを削除しました');
                    }
                } catch (storageError) {
                    // ストレージエラーをキャッチしても処理を続行
                    console.error('サムネイル削除中に例外が発生:', storageError);
                }

                // パスをnullに設定（データベース更新用）
                thumbnailPath = null;
            }

            // 更新するデータの準備
            const updateData = {
                title,
                description: description || null,
                thumbnail_url: thumbnailPath,
                // 明示的に更新時刻を設定
                updated_at: new Date().toISOString()
            };

            console.log('更新するデータ:', updateData);
            console.log('モデルID:', model.id);

            // モデルデータを更新
            const { data: updatedData, error: updateError, count } = await supabase
                .from('models')
                .update(updateData)
                .eq('id', model.id)
                .select();

            console.log('更新結果 - データ:', updatedData, '件数:', count, 'エラー:', updateError);

            if (updateError) {
                console.error('データ更新エラー:', updateError);
                throw updateError;
            }

            if (!updatedData || updatedData.length === 0) {
                console.error('更新対象のレコードが見つかりませんでした。モデルID:', model.id);
                throw new Error('更新対象のモデルが見つかりませんでした');
            }

            console.log('更新成功！更新後のデータ:', updatedData);

            // 成功メッセージを表示
            alert('モデル情報が更新されました');

            // 更新後の画面遷移
            // 画面遷移前に少し待機して更新が完了するのを待つ
            setTimeout(() => {
                router.push('/profile');
            }, 500);
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

        // モデルIDの検証
        if (!model.id || typeof model.id !== 'string' || model.id.trim() === '') {
            console.error('無効なモデルID:', model.id);
            alert('無効なモデルIDです。ページを再読み込みしてお試しください。');
            return;
        }

        if (!confirm('このモデルを削除してもよろしいですか？この操作は元に戻せません。')) {
            return;
        }

        try {
            setDeleting(true);
            const supabase = createClientSupabase();

            // 削除対象のデータを記録（バックアップ目的）
            console.log('削除対象のモデル情報:', {
                id: model.id,
                title: model.title,
                file_url: model.file_url,
                thumbnail_url: model.thumbnail_url
            });

            // ストレージ削除処理のためのラッパー関数（エラーハンドリング強化）
            const deleteFromStorage = async (bucket: string, path: string | null) => {
                if (!path) return { success: true };

                console.log(`${bucket}から削除実行:`, path);
                try {
                    const { error } = await supabase.storage
                        .from(bucket)
                        .remove([path]);

                    if (error) {
                        console.error(`${bucket}の削除エラー:`, error);
                        return { success: false, error };
                    }

                    console.log(`${bucket}から正常に削除されました:`, path);
                    return { success: true };
                } catch (e) {
                    console.error(`${bucket}の削除例外:`, e);
                    return { success: false, error: e };
                }
            };

            // ストレージからのファイル削除を先に実行
            const fileDeleteResult = await deleteFromStorage('model_files', model.file_url);
            if (!fileDeleteResult.success) {
                console.warn('モデルファイルの削除に失敗しましたが、処理を続行します');
            }

            // サムネイルの削除
            if (model.thumbnail_url) {
                const thumbnailDeleteResult = await deleteFromStorage('model_thumbnails', model.thumbnail_url);
                if (!thumbnailDeleteResult.success) {
                    console.warn('サムネイルの削除に失敗しましたが、処理を続行します');
                }
            }

            // データベースからモデルを削除
            console.log('データベースからモデルを削除します。ID:', model.id);
            const { data: deleteData, error: deleteError } = await supabase
                .from('models')
                .delete()
                .eq('id', model.id)
                .select();

            if (deleteError) {
                console.error('モデル削除エラー:', deleteError);
                throw new Error(`データベースからのモデル削除に失敗しました: ${deleteError.message}`);
            }

            if (!deleteData || deleteData.length === 0) {
                console.error('削除対象のレコードが見つかりませんでした。モデルID:', model.id);
                throw new Error('削除対象のモデルが見つかりませんでした');
            }

            console.log('削除成功！削除されたデータ:', deleteData);

            // 成功メッセージを表示
            alert('モデルを削除しました');

            // 画面遷移前に少し待機して削除が完了するのを待つ
            setTimeout(() => {
                router.push('/profile');
            }, 500);
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
        // サムネイルが明示的に削除されたことをモデルに記録
        setModel(prevModel => prevModel ? { ...prevModel, thumbnail_url: null } : null);
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
                            このモデルを削除すると、元に戻せません。すべての関連データも削除されます。
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