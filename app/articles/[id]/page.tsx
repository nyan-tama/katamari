import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { formatDistance } from 'date-fns';
import { ja } from 'date-fns/locale';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Image from 'next/image';

// ビューカウント更新用のサーバーアクションを定義
async function incrementViewCount(articleId: string) {
  'use server';

  const supabase = createServerComponentClient({ cookies });

  await supabase
    .from('articles')
    .update({ view_count: supabase.rpc('increment', { field: 'view_count' }) })
    .eq('id', articleId);
}

export default async function ArticlePage({ params }: { params: { id: string } }) {
  const supabase = createServerComponentClient({ cookies });

  // 記事データを取得
  const { data: article, error } = await supabase
    .from('articles')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !article) {
    console.error('記事の取得に失敗しました:', error);
    notFound();
  }

  // 著者情報を取得
  const { data: author, error: authorError } = await supabase
    .from('users')
    .select('*')
    .eq('id', article.author_id)
    .single();

  if (authorError) {
    console.error('著者情報の取得に失敗しました:', authorError);
    return <div>著者情報の読み込み中にエラーが発生しました。</div>;
  }

  // ヒーロー画像情報を取得
  let heroImage = null;
  if (article.hero_image_id) {
    const { data: mediaData, error: mediaError } = await supabase
      .from('article_media')
      .select('*')
      .eq('id', article.hero_image_id)
      .single();

    if (mediaError) {
      console.error('ヒーロー画像の取得に失敗しました:', mediaError);
    } else if (mediaData) {
      // ストレージからURLを生成
      console.log('ストレージ情報:', {
        bucket: mediaData.storage_bucket,
        path: mediaData.storage_path
      }); // ストレージ情報を確認

      // ストレージパスを適切にエンコード
      const encodedPath = mediaData.storage_path
        .split('/')
        .map((segment: string) => encodeURIComponent(segment))
        .join('/');

      const { data } = supabase.storage
        .from(mediaData.storage_bucket)
        .getPublicUrl(encodedPath);

      console.log('生成されたURL:', data.publicUrl); // 生成されたURLを確認

      heroImage = data.publicUrl;
    }
  }

  // 記事に添付されたファイルを取得
  const { data: files, error: filesError } = await supabase
    .from('download_files')
    .select('*')
    .eq('article_id', params.id);

  if (filesError) {
    console.error('ファイルの取得に失敗しました:', filesError);
    return <div>ファイルの読み込み中にエラーが発生しました。</div>;
  }

  // ビューカウントを増やす（実際のプロダクションでは重複カウントを防ぐ仕組みが必要）
  await incrementViewCount(params.id);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 記事ヘッダー */}
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">{article.title}</h1>

        {/* 著者情報 */}
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
            {author.avatar_url ? (
              <Image
                src={author.avatar_url}
                alt={author.name}
                width={40}
                height={40}
                className="w-full h-full object-cover"
                unoptimized={true}
              />
            ) : (
              <div className="w-full h-full bg-gray-300 flex items-center justify-center text-sm text-gray-600">
                {author.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <div className="font-medium">{author.name}</div>
            <div className="text-sm text-gray-500">
              {formatDistance(new Date(article.created_at), new Date(), {
                addSuffix: true,
                locale: ja,
              })}
            </div>
          </div>
        </div>

        {/* ヒーロー画像 */}
        {heroImage && (
          <div className="aspect-w-16 aspect-h-9 mb-6">
            <Image
              src={heroImage}
              alt={article.title}
              width={1200}
              height={675}
              className="w-full h-full object-cover rounded-lg"
              unoptimized={true}
            />
          </div>
        )}
      </header>

      {/* 記事本文 */}
      <div
        className="prose prose-lg max-w-none mb-12"
        dangerouslySetInnerHTML={{ __html: article.content }}
      />

      {/* 添付ファイル一覧 */}
      {files && files.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">添付ファイル</h2>
          <div className="space-y-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 bg-white rounded border border-gray-200"
              >
                <div className="flex items-center">
                  <div className="mr-3 text-gray-400">📄</div>
                  <div>
                    <div className="font-medium">{file.filename}</div>
                    <div className="text-xs text-gray-500">
                      {(file.file_size / 1024).toFixed(2)} KB
                    </div>
                  </div>
                </div>
                <a
                  href={`/api/download?fileId=${file.id}`}
                  className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded text-sm hover:bg-indigo-200"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ダウンロード
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ナビゲーション */}
      <div className="flex justify-between mt-12 pt-6 border-t border-gray-200">
        <Link href="/articles" className="text-indigo-600 hover:text-indigo-800">
          ← 記事一覧に戻る
        </Link>
      </div>
    </div>
  );
} 