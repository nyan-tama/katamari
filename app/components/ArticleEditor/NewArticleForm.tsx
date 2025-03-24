'use client';

import { useEffect } from 'react';
import useArticleForm from '@/app/hooks/useArticleForm';
import HeroImageUploader from './HeroImageUploader';
import CustomFileSelector from '@/app/components/CustomFileSelector';

/**
 * 新規記事作成フォームコンポーネント
 */
export default function NewArticleForm() {
  const {
    title,
    setTitle,
    content,
    setContent,
    handleHeroImageChange,
    isSubmitting,
    error,
    filesError,
    filesErrorType,
    userId,
    selectedFiles,
    setSelectedFiles,
    handleSave
  } = useArticleForm();

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

      {filesError && (
        <div className={`${filesErrorType === 'error'
          ? 'bg-red-100 border-2 border-red-400 text-red-700'
          : 'bg-yellow-100 border-2 border-yellow-400 text-yellow-700'} px-4 py-3 rounded mb-4`}>
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">{filesErrorType === 'error' ? 'ファイルエラー' : '注意'}</span>
          </div>
          <div className="mt-1 whitespace-pre-line">{filesError}</div>
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

      <HeroImageUploader
        onImageSelected={handleHeroImageChange}
        error={null}
      />

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
          onFilesSelected={(files: File[]) => setSelectedFiles(files)}
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