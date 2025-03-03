'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientSupabase, getPublicUrl } from '@/lib/supabase-client';
import { User } from '@supabase/supabase-js';
import Link from 'next/link';

// モデル型定義
interface Model {
    id: string;
    title: string;
    description?: string;
    thumbnail_url?: string;
    file_url: string;
    created_at: string;
}

export default function ProfilePage() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [userModels, setUserModels] = useState<Model[]>([]);
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

    const handleDeleteModel = async (modelId: string, fileUrl: string, thumbnailUrl?: string) => {
        if (!confirm('このモデルを削除してもよろしいですか？この操作は元に戻せません。')) {
            return;
        }

        try {
            setLoading(true);
            const supabase = createClientSupabase();

            // データベースからモデルを削除
            const { error: deleteError } = await supabase
                .from('models')
                .delete()
                .eq('id', modelId);

            if (deleteError) throw deleteError;

            // ストレージからモデルファイルを削除
            const { error: fileDeleteError } = await supabase.storage
                .from('model_files')
                .remove([fileUrl]);

            if (fileDeleteError) console.error('Error deleting model file:', fileDeleteError);

            // サムネイルがある場合は削除
            if (thumbnailUrl) {
                const { error: thumbnailDeleteError } = await supabase.storage
                    .from('model_thumbnails')
                    .remove([thumbnailUrl]);

                if (thumbnailDeleteError) console.error('Error deleting thumbnail:', thumbnailDeleteError);
            }

            // 成功したら画面を更新
            setUserModels(userModels.filter(model => model.id !== modelId));
            alert('モデルを削除しました');
        } catch (error) {
            console.error('Error deleting model:', error);
            alert('モデル削除中にエラーが発生しました');
        } finally {
            setLoading(false);
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
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                        <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
                            {user?.email?.charAt(0).toUpperCase() || 'U'}
                        </div>

                        <div className="flex-1 text-center md:text-left">
                            <h1 className="text-2xl font-bold text-gray-800 mb-2">
                                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'ユーザー'}
                            </h1>
                            <p className="text-gray-600 mb-4">
                                {user?.email}
                            </p>

                            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                                <Link
                                    href="/upload"
                                    className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-md transition-colors"
                                >
                                    新規アップロード
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* アップロード済みモデル */}
                <div className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">アップロードしたモデル</h2>

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
                                                <div className="absolute bottom-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1">
                                                    {model.thumbnail_url.split('/').pop()?.substring(0, 10)}...
                                                </div>
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
                                            <button
                                                onClick={() => handleDeleteModel(model.id, model.file_url, model.thumbnail_url)}
                                                className="text-sm text-red-600 hover:text-red-800"
                                            >
                                                削除
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow-md p-8 text-center">
                            <p className="text-gray-600 mb-4">まだモデルをアップロードしていません</p>
                            <Link
                                href="/upload"
                                className="inline-block bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-md transition-colors"
                            >
                                最初のモデルをアップロード
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}