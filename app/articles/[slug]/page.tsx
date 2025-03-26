import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { formatDistance } from 'date-fns';
import { ja } from 'date-fns/locale';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import NavigationButtons from '@/app/components/NavigationButtons';
import FileDownloader from '@/app/components/FileDownloader';
import type { Metadata } from 'next';

// ビューカウント更新用のサーバーアクションを定義
async function incrementViewCount(articleId: string) {
  'use server';

  const supabase = createServerComponentClient({ cookies });

  await supabase
    .from('articles')
    .update({ view_count: supabase.rpc('increment', { field: 'view_count' }) })
    .eq('id', articleId);
}

// Supabaseストレージからの公開URL取得
const getPublicUrl = (bucket: string, path: string | null): string => {
  if (!path) return '';

  // パスが既に完全なURLの場合はそのまま返す
  if (path.startsWith('http')) {
    return path;
  }

  // Supabase URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dhvkmwrudleimrzppamd.supabase.co';

  // 公開URLを生成
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
};

// 動的メタデータ生成
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const supabase = createServerComponentClient({ cookies });

  // 記事データを取得
  const { data: article, error } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', params.slug)
    .single();

  if (error || !article) {
    return {
      title: 'ページが見つかりません',
      description: '指定された記事が見つかりませんでした。',
    };
  }

  // 記事の内容からHTMLタグを除去してプレーンテキスト化し、最初の100文字を説明文として使用
  const plainText = article.content ? article.content.replace(/<[^>]*>/g, '') : '';
  const description = plainText.length > 100 ? plainText.slice(0, 100) + '...' : plainText;

  // 著者情報を取得
  const { data: author } = await supabase
    .from('users')
    .select('name')
    .eq('id', article.author_id)
    .single();

  // メイン画像URLを取得
  let imageUrl = null;
  if (article.hero_image_id) {
    const { data: mediaData } = await supabase
      .from('article_media')
      .select('storage_bucket, storage_path')
      .eq('id', article.hero_image_id)
      .single();

    if (mediaData) {
      const { data } = supabase.storage
        .from(mediaData.storage_bucket)
        .getPublicUrl(mediaData.storage_path);

      imageUrl = data.publicUrl;
    }
  }

  return {
    title: article.title,
    description: description || '3Dプリンターデータの記事',
    openGraph: {
      type: 'article',
      title: article.title,
      description: description || '3Dプリンターデータの記事',
      url: `https://katamari.jp/articles/${article.slug}`,
      images: imageUrl
        ? [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: article.title,
          },
        ]
        : ['/og-image.jpg'],
      publishedTime: article.published_at || article.created_at,
      modifiedTime: article.updated_at,
      authors: author ? [author.name] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: description || '3Dプリンターデータの記事',
      images: imageUrl ? [imageUrl] : ['/og-image.jpg'],
    },
  };
}

// キャッシュを無効化するためのオプションを追加
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ArticlePage({ params }: {
  params: { slug: string }
}) {
  const supabase = createServerComponentClient({ cookies });

  // 記事データを取得（キャッシュを使用せず常に最新データを取得）
  const { data: article, error } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', params.slug)
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

  // ログインユーザー情報を取得
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthor = user && article && user.id === article.author_id;

  // 著者アバターURLを取得する関数を修正
  const getAuthorAvatarUrl = () => {
    if (!author) return '';

    // カスタムアバターがある場合は最優先（ユーザーがアップロードしたもの）
    if (author.avatar_storage_path) {
      return getPublicUrl('avatars', author.avatar_storage_path);
    }

    // 次にデフォルトアバター（GoogleやGitHubのアバターなど）
    if (author.default_avatar_url) {
      if (author.default_avatar_url.startsWith('http')) {
        return author.default_avatar_url;
      }
      return getPublicUrl('avatars', author.default_avatar_url);
    }

    // 次にavatar_urlを確認（レガシーサポート用）
    if (author.avatar_url) {
      if (author.avatar_url.startsWith('http')) {
        return author.avatar_url;
      }
      return getPublicUrl('avatars', author.avatar_url);
    }

    return '';
  };

  // アバターURLを取得
  const avatarUrl = getAuthorAvatarUrl();
  const hasAvatar = !!avatarUrl;

  // メイン画像情報を取得
  let heroImage = null;
  if (article.hero_image_id) {
    console.log('記事のメイン画像ID:', article.hero_image_id);

    const { data: mediaData, error: mediaError } = await supabase
      .from('article_media')
      .select('*')
      .eq('id', article.hero_image_id)
      .single();

    if (mediaError) {
      console.error('メイン画像の取得に失敗しました:', mediaError);
    } else if (mediaData) {
      // ストレージからURLを生成
      console.log('メイン画像データ:', mediaData);
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
  const { data: downloadFiles, error: filesError } = await supabase
    .from('download_files')
    .select('*')
    .eq('article_id', article.id);

  // デバッグ用にログを追加
  console.log('ダウンロードファイル:', JSON.stringify(downloadFiles));
  console.log('ファイルエラー:', filesError);

  if (filesError) {
    console.error('ファイルの取得に失敗しました:', filesError);
    return <div>ファイルの読み込み中にエラーが発生しました。</div>;
  }

  // ビューカウントを増やす（実際のプロダクションでは重複カウントを防ぐ仕組みが必要）
  await incrementViewCount(article.id);

  // 非公開状態かどうか
  const isDraft = article.status === 'draft';

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 記事ヘッダー */}
      <header className="mb-8">
        <div className="flex items-center mb-4">
          <h1 className="text-3xl md:text-4xl font-bold">{article.title}</h1>
          {isDraft && isAuthor && (
            <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
              非公開
            </span>
          )}
        </div>

        {/* 著者情報と記事メタ情報 */}
        <div className="flex flex-wrap items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full overflow-hidden mr-3 border border-gray-300 shadow-sm">
              {hasAvatar ? (
                <Image
                  src={avatarUrl}
                  alt={author.name}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                  unoptimized={true}
                />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-sm text-gray-600 border border-gray-200">
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

          {/* 編集ボタン（著者のみ表示） */}
          {isAuthor && (
            <Link
              href={`/articles/${article.slug}/edit`}
              className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 inline-flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              編集
            </Link>
          )}
        </div>

        {/* メイン画像 */}
        {heroImage && (
          <div className="aspect-w-16 aspect-h-9 mb-6">
            <Image
              src={`${heroImage}?t=${Date.now()}`}
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

      {/* 添付ファイル一覧 - FileDownloaderコンポーネントに置き換え */}
      <FileDownloader
        articleId={article.id}
      />

      {/* ナビゲーション */}
      <div className="flex justify-between mt-12 pt-6 border-t border-gray-200">
        {/* NavigationButtonsコンポーネントを使用 */}
        <NavigationButtons />
      </div>
    </div>
  );
} 