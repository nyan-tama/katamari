'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { EditorContent } from '@tiptap/react';
import { useArticleForm } from '@/app/hooks/useArticleForm';
import HeroImageUploader from './HeroImageUploader';
import FileSelector from './FileSelector';
import { ErrorWithMessage } from '@/app/types/error';
import ActionButtons from './ActionButtons';

/**
 * 新規記事作成フォームコンポーネント
 */
export default function NewArticleForm() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);

  const {
    title, setTitle,
    editor,
    heroImageId, setHeroImageId,
    heroImageFile, setHeroImageFile,
    selectedFiles, setSelectedFiles
  } = useArticleForm();

  const handleSubmit = async (event: FormEvent, isDraft: boolean) => {
    event.preventDefault();
    
    if (!title.trim()) {
      setError('タイトルを入力してください');
      return;
    }
    
    if (!editor?.getHTML() || editor?.getHTML() === '<p></p>') {
      setError('制作物の内容を入力してください');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      setFileUploadError(null);
      
      // ログインしているユーザーの情報を取得
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('ログインが必要です');
        return;
      }
      
      // メイン画像があれば先にアップロードする
      let heroImageIdToUse = heroImageId;
      
      if (heroImageFile && !heroImageId) {
        try {
          const timestamp = Date.now();
          const fileExt = heroImageFile.name.split('.').pop();
          const filePath = `hero-images/${user.id}/${timestamp}.${fileExt}`;
          
          const { error: uploadError, data } = await supabase.storage
            .from('article-media')
            .upload(filePath, heroImageFile);
          
          if (uploadError) {
            throw uploadError;
          }
          
          // メディアレコードを作成
          const { data: mediaData, error: mediaError } = await supabase
            .from('media')
            .insert({
              storage_bucket: 'article-media',
              storage_path: filePath,
              filename: heroImageFile.name,
              content_type: heroImageFile.type,
              user_id: user.id
            })
            .select('id')
            .single();
          
          if (mediaError) {
            throw mediaError;
          }
          
          heroImageIdToUse = mediaData.id;
        } catch (e) {
          console.error('メイン画像のアップロードエラー:', e);
          setFileUploadError('メイン画像のアップロードに失敗しました');
          return;
        }
      }
      
      // 添付ファイルをアップロード（もしあれば）
      const fileIds: Record<string, string> = {};
      
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          if (file.fileId) {
            // 既存のファイルの場合はIDをそのまま使用
            fileIds[file.fileId] = file.name;
          } else if (file.file) {
            // 新しいファイルの場合はアップロード
            try {
              const timestamp = Date.now();
              const fileExt = file.file.name.split('.').pop();
              const filePath = `download-files/${user.id}/${timestamp}_${file.file.name}`;
              
              const { error: uploadError } = await supabase.storage
                .from('article-files')
                .upload(filePath, file.file);
              
              if (uploadError) {
                throw uploadError;
              }
              
              // ファイルレコードを作成
              const { data: fileData, error: fileError } = await supabase
                .from('download_files')
                .insert({
                  storage_bucket: 'article-files',
                  storage_path: filePath,
                  filename: file.file.name,
                  display_name: file.name || file.file.name,
                  content_type: file.file.type,
                  size_bytes: file.file.size,
                  user_id: user.id
                })
                .select('id')
                .single();
              
              if (fileError) {
                throw fileError;
              }
              
              fileIds[fileData.id] = file.name || file.file.name;
            } catch (e) {
              console.error('添付ファイルのアップロードエラー:', e);
              setFileUploadError('ファイルのアップロードに失敗しました');
              return;
            }
          }
        }
      }
      
      // タイトルからスラグを生成
      const slug = title
        .trim()
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        + '-' + Date.now().toString().slice(-6);
      
      // 制作物を作成
      const { data: article, error: articleError } = await supabase
        .from('articles')
        .insert({
          title: title.trim(),
          slug: slug,
          content: editor?.getHTML() || '',
          author_id: user.id,
          status: isDraft ? 'draft' : 'published',
          hero_image_id: heroImageIdToUse || null
        })
        .select('id, slug')
        .single();
      
      if (articleError) {
        throw articleError;
      }
      
      // 添付ファイルの関連付けを作成
      if (Object.keys(fileIds).length > 0) {
        const attachments = Object.entries(fileIds).map(([fileId, displayName]) => ({
          article_id: article.id,
          file_id: fileId,
          display_name: displayName
        }));
        
        const { error: attachError } = await supabase
          .from('article_attachments')
          .insert(attachments);
        
        if (attachError) {
          console.error('添付ファイルの関連付けに失敗:', attachError);
          // エラーがあっても続行する（制作物自体は作成されている）
        }
      }
      
      // 成功したら詳細ページにリダイレクト
      router.push(`/articles/${article.slug}`);
      router.refresh();
    } catch (e) {
      console.error('制作物作成エラー:', e);
      const err = e as ErrorWithMessage;
      setError(err.message || '制作物の作成に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">新しい制作物を作成</h1>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      
      {fileUploadError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded mb-6">
          {fileUploadError} - 制作物は保存されていません。再度お試しください。
        </div>
      )}
      
      <form onSubmit={(e) => handleSubmit(e, false)}>
        <div className="mb-6">
          <label htmlFor="title" className="block text-gray-700 font-medium mb-2">
            タイトル
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
            placeholder="制作物のタイトルを入力"
            required
          />
        </div>
        
        <div className="mb-8">
          <HeroImageUploader
            heroImageId={heroImageId}
            setHeroImageId={setHeroImageId}
            heroImageFile={heroImageFile} 
            setHeroImageFile={setHeroImageFile}
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2">
            内容
          </label>
          <div className="min-h-[300px] border border-gray-300 rounded-md p-4 mb-2">
            <EditorContent editor={editor} />
          </div>
          <p className="text-sm text-gray-500">
            制作物の詳細、作り方、使用方法などを記入してください。
          </p>
        </div>
        
        <div className="mb-8">
          <FileSelector 
            selectedFiles={selectedFiles}
            setSelectedFiles={setSelectedFiles}
          />
        </div>
        
        <ActionButtons 
          onDraftClick={(e) => handleSubmit(e, true)} 
          onPublishClick={(e) => handleSubmit(e, false)}
          isSubmitting={isSubmitting}
        />
      </form>
    </div>
  );
} 