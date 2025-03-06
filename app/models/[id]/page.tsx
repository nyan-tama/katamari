'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClientSupabase, getPublicUrl } from '@/lib/supabase-client';
import { Metadata } from 'next';

interface ModelUser {
    id: string;
    name: string;
    avatar_url: string | null;
}

interface Model {
    id: string;
    title: string;
    description: string | null;
    file_url: string;
    thumbnail_url: string | null;
    created_at: string;
    user_id: string;
    user?: ModelUser;
}

export default function ModelDetailPage() {
    const params = useParams();
    const [loading, setLoading] = useState(true);
    const [model, setModel] = useState<Model | null>(null);

    useEffect(() => {
        const fetchModel = async () => {
            try {
                setLoading(true);
                const supabase = createClientSupabase();
                const modelId = params.id as string;

                // モデルデータを取得
                const { data: modelData, error: modelError } = await supabase
                    .from('models')
                    .select('*')
                    .eq('id', modelId)
                    .single();

                if (modelError) throw modelError;
                if (!modelData) {
                    return;
                }

                // ユーザー情報を取得
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('id, name, avatar_url')
                    .eq('id', modelData.user_id)
                    .single();

                if (userError) throw userError;

                // モデルとユーザー情報を結合
                setModel({
                    ...modelData,
                    user: userData
                });
            } catch (error) {
                console.error('Error fetching model:', error);
            } finally {
                setLoading(false);
            }
        };

        if (params.id) {
            fetchModel();
        }
    }, [params.id]);

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
                    <Link href="/" className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-md transition-colors">
                        ホームに戻る
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
                {/* パンくずリスト */}
                <div className="mb-6">
                    <nav className="text-sm text-gray-500">
                        <Link href="/" className="hover:text-pink-500">ホーム</Link>
                        <span className="mx-2">›</span>
                        <span className="text-gray-800">{model.title}</span>
                    </nav>
                </div>

                <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
                    {/* モデルビューアー部分（実際のアプリでは3Dビューアーを実装） */}
                    <div className="aspect-video bg-gray-100 flex items-center justify-center">
                        {model?.thumbnail_url ? (
                            <>
                                <img
                                    src={getPublicUrl('model_thumbnails', model.thumbnail_url)}
                                    alt={model.title}
                                    className="object-contain w-full h-full"
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
                            <p className="text-gray-400">
                                画像がありません
                            </p>
                        )}
                    </div>

                    {/* モデル情報 */}
                    <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <h1 className="text-2xl font-bold text-gray-800">{model?.title}</h1>
                            <Link
                                href={getPublicUrl('model_files', model?.file_url || '')}
                                className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-md transition-colors"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                ダウンロード
                            </Link>
                        </div>

                        <div className="flex items-center text-gray-600 text-sm mb-6">
                            <span>投稿者: {model?.user?.name || '不明'}</span>
                            <span className="mx-2">•</span>
                            <span>投稿日: {model?.created_at ? new Date(model.created_at).toLocaleDateString('ja-JP') : '不明'}</span>
                        </div>

                        <div className="border-t border-gray-100 pt-4">
                            <h2 className="font-semibold text-lg mb-2">説明</h2>
                            <div className="text-gray-700 whitespace-pre-line">
                                {model?.description || '説明はありません'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 関連モデル */}
                <div className="mb-12">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">関連モデル</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* 実際のアプリでは関連モデルを表示 */}
                        <div className="bg-white rounded-lg shadow-md overflow-hidden">
                            <div className="aspect-square bg-gray-100"></div>
                            <div className="p-4">
                                <h3 className="font-medium text-gray-800">サンプルモデル</h3>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
    const model = await getModelById(params.id);

    return {
        // ...他のメタデータ
        openGraph: {
            title: model.title,
            description: model.description,
            url: `${process.env.NEXT_PUBLIC_SITE_URL}/models/${params.id}`,
            images: [
                {
                    url: model.thumbnail_url,
                    width: 1200,
                    height: 630,
                },
            ],
        },
    }
}