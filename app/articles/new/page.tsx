'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientSupabase } from '@/lib/supabase-client';
import { User } from '@supabase/supabase-js';
import Editor from '@/components/editor/Editor';

export default function NewArticlePage() {
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState({});
    const [summary, setSummary] = useState('');
    const [status, setStatus] = useState<'draft' | 'published'>('draft');
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [user, setUser] = useState<User | null>(null);

    const router = useRouter();

    // ユーザーのログイン状態を確認
    useEffect(() => {
        const checkUser = async () => {
            const supabase = createClientSupabase();
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.user) {
                router.push('/login');
                return;
            }

            setUser(session.user);
        };

        checkUser();
    }, [router]);

    const handleSave = async (asDraft: boolean = true) => {
        if (!title || !user) {
            alert('タイトルは必須です');
            return;
        }

        if (Object.keys(content).length === 0) {
            alert('本文を入力してください');
            return;
        }

        try {
            setLoading(true);
            const supabase = createClientSupabase();

            let thumbnailPath = null;

            // サムネイル画像がある場合はアップロード
            if (thumbnailFile) {
                // サムネイルのサイズチェック (5MB制限)
                if (thumbnailFile.size > 5 * 1024 * 1024) {
                    throw new Error('サムネイルサイズが大きすぎます（最大5MB）');
                }

                const thumbnailExt = thumbnailFile.name.split('.').pop();
                thumbnailPath = `${user.id}/${Date.now()}_article_thumbnail.${thumbnailExt}`;

                const { error: thumbnailUploadError } = await supabase.storage
                    .from('article_thumbnails')
                    .upload(thumbnailPath, thumbnailFile, {
                        upsert: true,
                        cacheControl: '3600'
                    });

                if (thumbnailUploadError) {
                    throw thumbnailUploadError;
                }
            }

            const articleStatus = asDraft ? 'draft' : 'published';
            const publishedAt = asDraft ? null : new Date().toISOString();

            // 記事をデータベースに保存
            const { data: article, error: insertError } = await supabase
                .from('articles')
                .insert({
                    user_id: user.id,
                    title,
                    content,
                    summary: summary || null,
                    thumbnail_url: thumbnailPath,
                    status: articleStatus,
                    published_at: publishedAt
                })
                .select('id')
                .single();

            if (insertError) {
                throw insertError;
            }

            alert(asDraft ? '下書きとして保存しました' : '記事を公開しました');

            // 作成した記事ページに移動
            router.push(`/articles/${article.id}`);
        } catch (error) {
            let errorMessage = '不明なエラーが発生しました。';

            if (error instanceof Error) {
                errorMessage = error.message;
            }

            alert(`保存中にエラーが発生しました: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">新しい記事を作成</h1>

                <div className="bg-white rounded-lg shadow-md">
                    <div className="p-6">
                        <div className="mb-4">
                            <input
                                type="text"
                                placeholder="タイトルを入力してください"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-4 py-2 text-2xl font-bold border-b border-gray-200 focus:outline-none focus:border-pink-500"
                            />
                        </div>

                        <div className="mb-6">
                            <textarea
                                placeholder="記事の概要（任意）"
                                value={summary}
                                onChange={(e) => setSummary(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 h-20"
                            />
                        </div>

                        <div className="mb-6">
                            <Editor
                                initialContent={{}}
                                onChange={setContent}
                            />
                        </div>

                        <div className="mb-6">
                            <label className="block text-gray-700 font-medium mb-2">
                                サムネイル画像（任意）
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setThumbnailFile(e.target.files ? e.target.files[0] : null)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                            />
                            <p className="text-sm text-gray-500 mt-1">
                                推奨サイズ: 1200x630px、最大: 5MB
                            </p>
                        </div>

                        <div className="flex justify-end space-x-4">
                            <button
                                type="button"
                                onClick={() => handleSave(true)}
                                disabled={loading}
                                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-md font-medium transition-colors disabled:bg-gray-100"
                            >
                                下書き保存
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSave(false)}
                                disabled={loading}
                                className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-md font-medium transition-colors disabled:bg-pink-300"
                            >
                                {loading ? '保存中...' : '公開する'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 