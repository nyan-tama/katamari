'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TipTapEditor from '../../components/Editor/TipTapEditor';
import { createArticle } from '../../../lib/api/articles';
import { createClientSupabase } from '@/lib/supabase-client';

export default function NewArticlePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [heroImage, setHeroImage] = useState<File | null>(null);
  const [heroImagePreview, setHeroImagePreview] = useState<string | null>(null);
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // ページロード時にユーザー情報を取得
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClientSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        // ログインしていない場合はログインページへリダイレクト
        router.push('/login');
      }
    };
    
    checkAuth();
  }, [router]);

  // ヒーロー画像の選択ハンドラ
  const handleHeroImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setHeroImage(file);
      const objectUrl = URL.createObjectURL(file);
      setHeroImagePreview(objectUrl);
    }
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

      // ヒーロー画像のアップロード（もし選択されていれば）
      let heroImageUrl = null;
      if (heroImage) {
        const filename = `${Date.now()}_${heroImage.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('media')
          .upload(`${userId}/${filename}`, heroImage);

        if (uploadError) {
          console.error('画像アップロードエラー:', uploadError);
          setError('画像のアップロードに失敗しました');
          setIsSubmitting(false);
          return;
        }

        // 公開URLを取得
        const { data } = supabase.storage
          .from('media')
          .getPublicUrl(`${userId}/${filename}`);
        
        heroImageUrl = data.publicUrl;
      }

      // 記事の作成
      const article = await createArticle(userId, {
        title,
        content,
        hero_image: heroImageUrl || undefined,
        status: saveStatus,
      });

      // 成功したら記事詳細ページにリダイレクト
      router.push(`/articles/${article.id}`);
    } catch (err) {
      console.error('記事保存エラー:', err);
      setError('記事の保存に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ログインしていない場合はローディング状態を表示
  if (userId === null) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <p className="text-center">ログイン状態を確認中...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">新しい記事を作成</h1>

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
          ヒーロー画像（オプション）
        </label>
        <input
          type="file"
          id="heroImage"
          accept="image/*"
          onChange={handleHeroImageChange}
          className="w-full"
        />
        {heroImagePreview && (
          <div className="mt-2">
            <img
              src={heroImagePreview}
              alt="ヒーロー画像プレビュー"
              className="w-full max-h-64 object-cover rounded-md"
            />
          </div>
        )}
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

      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => handleSave('draft')}
          disabled={isSubmitting}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
        >
          下書き保存
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
  );
} 