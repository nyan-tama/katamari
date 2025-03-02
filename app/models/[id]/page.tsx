'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';
import { createClientSupabase } from '@/lib/supabase-client';

interface ModelUser {
    id: string;
    name: string;
    avatar_url: string | null;
}

interface Model {
    id: string;
    title: string;
    description: string;
    created_at: string;
    user: ModelUser;
}

// 仮のデータ（実際のアプリではSupabaseから取得します）
const mockModelData: Model = {
    id: '1',
    title: 'かわいいクッキー型',
    description: 'SNS映えするユニークなクッキーが作れる型枠です。3Dプリンターで出力して、お菓子作りを楽しみましょう。\n\n食品衛生面を考慮して、PLAなどの食品安全素材での出力をお勧めします。',
    created_at: '2025-02-28',
    user: {
        id: 'user1',
        name: 'カタワク公式',
        avatar_url: null
    }
};

export default function ModelDetailPage() {
    const params = useParams();
    const [loading, setLoading] = useState(true);
    const [model, setModel] = useState<Model | null>(null);

    useEffect(() => {
        // 実際のアプリではここでSupabaseからモデルデータを取得します
        const fetchModel = async () => {
            try {
                setLoading(true);

                // モックデータを使用
                setModel(mockModelData);
            } catch (error) {
                console.error('Error fetching model:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchModel();
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
                        <p className="text-gray-400">
                            3Dモデルビューアー（実装予定）
                        </p>
                    </div>

                    {/* モデル情報 */}
                    <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <h1 className="text-2xl font-bold text-gray-800">{model.title}</h1>
                            <button className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-md transition-colors">
                                ダウンロード
                            </button>
                        </div>

                        <div className="flex items-center text-gray-600 text-sm mb-6">
                            <span>投稿者: {model.user.name}</span>
                            <span className="mx-2">•</span>
                            <span>投稿日: {model.created_at}</span>
                        </div>

                        <div className="border-t border-gray-100 pt-4">
                            <h2 className="font-semibold text-lg mb-2">説明</h2>
                            <div className="text-gray-700 whitespace-pre-line">
                                {model.description}
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