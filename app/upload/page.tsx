'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

export default function UploadPage() {
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [modelFile, setModelFile] = useState<File | null>(null);
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [user, setUser] = useState<User | null>(null);

    const router = useRouter();

    // ユーザーのログイン状態を確認
    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.user) {
                // ログインしていない場合はログインページへリダイレクト
                router.push('/login');
                return;
            }

            setUser(session.user);
        };

        checkUser();
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!modelFile || !title || !user) {
            alert('タイトルと3Dモデルファイルは必須です');
            return;
        }

        try {
            setLoading(true);

            // ファイル名から拡張子を取得
            const modelExt = modelFile.name.split('.').pop();
            const modelPath = `${user.id}/${Date.now()}_model.${modelExt}`;
            let thumbnailPath = null;

            // モデルファイルをアップロード
            const { error: modelUploadError } = await supabase.storage
                .from('models')
                .upload(modelPath, modelFile);

            if (modelUploadError) throw modelUploadError;

            // サムネイル画像がある場合はアップロード
            if (thumbnailFile) {
                const thumbnailExt = thumbnailFile.name.split('.').pop();
                thumbnailPath = `${user.id}/${Date.now()}_thumbnail.${thumbnailExt}`;

                const { error: thumbnailUploadError } = await supabase.storage
                    .from('thumbnails')
                    .upload(thumbnailPath, thumbnailFile);

                if (thumbnailUploadError) throw thumbnailUploadError;
            }

            // モデルのメタデータをデータベースに保存
            const { error: insertError } = await supabase
                .from('models')
                .insert({
                    user_id: user.id,
                    title,
                    description,
                    file_url: modelPath,
                    thumbnail_url: thumbnailPath
                });

            if (insertError) throw insertError;

            alert('モデルが正常にアップロードされました！');

            // アップロード後にプロフィールページに戻る
            router.push('/profile');
        } catch (error) {
            console.error('Error uploading model:', error);
            alert('アップロード中にエラーが発生しました。もう一度お試しください。');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">新しいモデルをアップロード</h1>

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
                            <label htmlFor="modelFile" className="block text-gray-700 font-medium mb-2">
                                3Dモデルファイル（STL, OBJ） <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="file"
                                id="modelFile"
                                accept=".stl,.obj"
                                onChange={(e) => setModelFile(e.target.files ? e.target.files[0] : null)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                                required
                            />
                            <p className="text-sm text-gray-500 mt-1">
                                最大ファイルサイズ: 50MB
                            </p>
                        </div>

                        <div className="mb-6">
                            <label htmlFor="thumbnailFile" className="block text-gray-700 font-medium mb-2">
                                サムネイル画像（任意）
                            </label>
                            <input
                                type="file"
                                id="thumbnailFile"
                                accept="image/*"
                                onChange={(e) => setThumbnailFile(e.target.files ? e.target.files[0] : null)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                            />
                            <p className="text-sm text-gray-500 mt-1">
                                推奨サイズ: 800x800px、最大: 5MB
                            </p>
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-md font-medium transition-colors disabled:bg-pink-300"
                            >
                                {loading ? 'アップロード中...' : 'アップロード'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}