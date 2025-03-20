'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TipTapEditor from '../../components/Editor/TipTapEditor';
import { createArticle, CreateArticleInput } from '../../../lib/api/articles';
import { createClientSupabase } from '@/lib/supabase-client';
import FileUploader from '../../components/FileUploader';
import CustomFileSelector from '../../components/CustomFileSelector';

export default function NewArticlePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [heroImage, setHeroImage] = useState<File | null>(null);
  const [heroImagePreview, setHeroImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

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

      // ヒーロー画像のアップロード（もし選択されていれば）
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

      // 記事の作成
      try {
        console.log('記事作成開始:', {
          title: title.length,
          content: content.length > 100 ? content.substring(0, 100) + '...' : content,
          status: saveStatus
        });

        // 公開時は公開日時も設定
        const articleData: CreateArticleInput = {
          title,
          content,
          status: saveStatus,
        };

        // 公開状態の場合は公開日時を設定
        if (saveStatus === 'published') {
          articleData.published_at = new Date().toISOString();
        }

        const article = await createArticle(userId, articleData);

        // 記事作成に成功したら、ヒーロー画像の情報をarticle_mediaテーブルに保存
        if (heroImageUrl) {
          try {
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

        console.log('記事作成成功:', article);

        // 記事の作成成功後
        if (article.id && selectedFiles.length > 0) {
          try {
            // 選択されたファイルをアップロード
            await uploadFiles(article.id, selectedFiles);
          } catch (err) {
            console.error('ファイルアップロードエラー:', err);
            // エラー処理（オプション）
          }
        }

        // 成功したら記事詳細ページにリダイレクト
        router.push(`/articles/${article.id}`);
      } catch (err) {
        console.error('記事保存エラー（詳細）:', JSON.stringify(err));
        setError('記事の保存に失敗しました');
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('記事保存エラー:', err);
      setError('記事の保存に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ファイルアップロード関数
  const uploadFiles = async (articleId: string, files: File[]) => {
    console.log('ファイルアップロード処理開始：', { articleId, fileCount: files.length });

    if (files.length === 0 || !userId) {
      console.log('ファイルなし、またはユーザーIDなし。アップロード処理スキップ');
      return;
    }

    const supabase = createClientSupabase();

    for (const file of files) {
      try {
        console.log(`ファイル「${file.name}」のアップロード開始:`, { size: file.size, type: file.type });

        // ファイル名のサニタイズ
        const sanitizedFileName = file.name.replace(/\s+/g, '_').replace(/[^\w_.]/gi, '');
        const fileName = `${Date.now()}_${sanitizedFileName}`;
        const filePath = `${articleId}/${fileName}`;

        console.log('アップロード先:', { bucket: 'downloads', filePath });

        // Supabaseストレージにアップロード
        const { data, error: uploadError } = await supabase.storage
          .from('downloads')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true
          });

        console.log('アップロード結果:', { data, error: uploadError });

        if (uploadError) {
          console.error(`ファイル「${file.name}」のアップロードに失敗:`, uploadError);
          continue; // 失敗しても次のファイルを試す
        }

        // download_filesテーブルにメタデータを保存
        const { data: fileData, error: fileError } = await supabase
          .from('download_files')
          .insert({
            article_id: articleId,
            storage_path: filePath,
            file_size: file.size,
            file_type: file.type,
            storage_bucket: 'downloads',
            original_name: file.name
          });

        console.log('メタデータ保存結果:', { data: fileData, error: fileError });

        if (fileError) {
          console.error(`ファイル「${file.name}」のメタデータ保存に失敗:`, fileError);
        }
      } catch (err) {
        console.error(`ファイル「${file.name}」の処理中にエラー:`, err);
      }
    }

    console.log('ファイルアップロード処理完了');
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
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="記事の内容を入力してください..."
          className="w-full p-3 border border-gray-300 rounded-md min-h-[300px]"
          rows={10}
        />
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ダウンロードファイル
        </label>
        <CustomFileSelector
          onFilesSelected={(files) => setSelectedFiles(files)}
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