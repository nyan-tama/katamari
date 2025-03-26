'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TipTapEditor from '../../components/Editor/TipTapEditor';
import { createArticle, CreateArticleInput } from '../../../lib/api/articles';
import { createClientSupabase } from '@/lib/supabase-client';
import FileUploader from '../../components/FileUploader';
import CustomFileSelector from '../../components/CustomFileSelector';
import { useAuth } from '../../hooks/useAuth';
import { useHeroImage } from '../../hooks/useHeroImage';
import { useFileUpload } from '../../hooks/useFileUpload';
import { HeroImageUploader } from '../../components/ArticleForm/HeroImageUploader';
import { ErrorDisplay } from '../../components/ArticleForm/ErrorDisplay';
import { filterSystemFiles } from '../../utils/fileValidation';

export default function NewArticlePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [filesErrorType, setFilesErrorType] = useState<'error' | 'warning'>('error');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // カスタムフックを使用
  const { userId, loading: authLoading } = useAuth();
  const {
    heroImage,
    heroImagePreview,
    handleHeroImageChange
  } = useHeroImage({ setError });

  const {
    uploadFiles,
    uploading
  } = useFileUpload({
    setFilesError,
    setFilesErrorType
  });

  // 記事の保存
  const handleSave = async (saveStatus: 'draft' | 'published' = 'draft') => {
    try {
      setIsSubmitting(true);
      setError(null);
      setFilesError(null); // エラーメッセージをリセット

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

      // 選択されたファイルを検証
      const { safeFiles, systemFolderFiles, detectedSystemFolder } = filterSystemFiles(selectedFiles);

      // システムフォルダが見つかった場合は警告を表示
      if (systemFolderFiles.length > 0) {
        setFilesError(`"${detectedSystemFolder}" を含むパスのファイル(${systemFolderFiles.length}件)はシステム関連フォルダのためアップロードできませんので除外しました`);
        setFilesErrorType('warning'); // 警告タイプに設定
      }

      const supabase = createClientSupabase();

      // メイン画像のアップロード（もし選択されていれば）
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

        // 記事作成に成功したら、メイン画像の情報をarticle_mediaテーブルに保存
        if (heroImageUrl) {
          try {
            // article_mediaテーブルにメイン画像の情報を追加
            const { data: mediaData, error: mediaError } = await supabase.from('article_media').insert({
              article_id: article.id,
              media_type: 'image',
              storage_bucket: 'article_media',
              storage_path: `${userId}/hero_images/${heroImageUrl.split('/').pop()}`,
              media_role: 'hero'
            }).select();

            if (mediaError) {
              console.error('メイン画像情報の保存に失敗しました:', mediaError);
            } else if (mediaData && mediaData.length > 0) {
              // メイン画像IDを記事に関連付け
              const { error: updateError } = await supabase
                .from('articles')
                .update({ hero_image_id: mediaData[0].id })
                .eq('id', article.id);

              if (updateError) {
                console.error('記事のメイン画像ID更新に失敗しました:', updateError);
              }
            }
          } catch (err) {
            console.error('メイン画像情報の保存に失敗しました:', err);
            // メイン画像情報の保存失敗は致命的エラーではないので続行
          }
        }

        console.log('記事作成成功:', article);

        // 記事の作成成功後、ファイルアップロード
        if (article.id && safeFiles.length > 0) {
          try {
            await uploadFiles(article.id, safeFiles);
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

  // ログインしていない場合はローディング状態を表示
  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <p className="text-center">ログイン状態を確認中...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">新規登録</h1>

      <ErrorDisplay error={error} />

      <ErrorDisplay
        error={filesError}
        type={filesErrorType}
      />

      <div className="mb-6">
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          タイトル
        </label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="タイトルを入力してください"
        />
      </div>

      <HeroImageUploader
        onHeroImageChange={handleHeroImageChange}
        heroImagePreview={heroImagePreview}
      />

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          内容
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="内容を入力してください..."
          className="w-full p-3 border border-gray-300 rounded-md min-h-[300px]"
          rows={10}
        />
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ダウンロード用ファイル
        </label>
        <CustomFileSelector
          onFilesSelected={(files) => setSelectedFiles(files)}
          onFilesDeleted={() => {
            // 新規作成時は単にUI上のファイル選択をクリアするだけでよい
            setSelectedFiles([]);
          }}
        />
      </div>

      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => handleSave('draft')}
          disabled={isSubmitting || uploading}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
        >
          下書き保存
        </button>
        <button
          type="button"
          onClick={() => handleSave('published')}
          disabled={isSubmitting || uploading}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          公開する
        </button>
      </div>
    </div>
  );
} 