import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { formatDistance } from 'date-fns';
import { ja } from 'date-fns/locale';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Script from 'next/script';
import type { Metadata, ResolvingMetadata } from 'next';
import NavigationButtons from '@/app/components/NavigationButtons';
import FileDownloader from '@/app/components/FileDownloader';

// ビューカウント更新用のサーバーアクションを定義
async function incrementViewCount(articleId: string) {
  'use server';

  const supabase = createServerComponentClient({ cookies });

  await supabase
    .from('articles')
    .update({ view_count: supabase.rpc('increment', { field: 'view_count' }) })
    .eq('id', articleId);
}

// 制作物データを取得する関数（メタデータ生成用に分離）
async function getArticleData(slug: string) {
  const supabase = createServerComponentClient({ cookies });
  
  // 制作物データを取得
  const { data: article, error } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !article) {
    console.error('制作物の取得に失敗しました:', error);
    return null;
  }

  // 著者情報を取得
  const { data: author, error: authorError } = await supabase
    .from('users')
    .select('*')
    .eq('id', article.author_id)
    .single();

  if (authorError) {
    console.error('著者情報の取得に失敗しました:', authorError);
  }

  // 制作物のヒーロー画像を取得
  let heroImageUrl = null;
  if (article.hero_image_id) {
    const { data: media } = await supabase
      .from('media')
      .select('url')
      .eq('id', article.hero_image_id)
      .single();
    
    if (media) {
      heroImageUrl = media.url;
    }
  }

  // 添付ファイルを取得
  const { data: attachments, error: attachmentsError } = await supabase
    .from('article_attachments')
    .select('id, file_id, file_name, display_name, download_count')
    .eq('article_id', article.id);

  if (attachmentsError) {
    console.error('添付ファイルの取得に失敗しました:', attachmentsError);
  }

  return {
    article,
    author: author || null,
    heroImageUrl,
    attachments: attachments || []
  };
}

// 動的メタデータを生成する関数
export async function generateMetadata(
  { params }: { params: { slug: string } },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const data = await getArticleData(params.slug);
  
  if (!data || !data.article) {
    return {
      title: '制作物が見つかりません',
      description: '要求された制作物は存在しないか、削除された可能性があります。'
    };
  }

  const { article, author, heroImageUrl } = data;
  
  // 親メタデータを取得
  const previousImages = (await parent).openGraph?.images || [];
  
  return {
    title: `${article.title} | 塊`,
    description: article.description || `${article.title}に関する制作物です。詳しい情報をご覧ください。`,
    keywords: [
      '3Dプリンター', 
      'モデル', 
      article.title,
      ...((article.tags as string[]) || [])
    ],
    
    openGraph: {
      title: article.title,
      description: article.description || `${article.title}に関する制作物です。`,
      type: 'article',
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/articles/${article.slug}`,
      images: heroImageUrl 
        ? [heroImageUrl]
        : previousImages,
      publishedTime: article.published_at,
      modifiedTime: article.updated_at,
      authors: author ? [`${author.first_name} ${author.last_name}`] : undefined,
      tags: article.tags as string[],
    },
    
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.description || `${article.title}に関する制作物です。`,
      images: heroImageUrl ? [heroImageUrl] : undefined,
    }
  };
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

// キャッシュを無効化するためのオプションを追加
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ArticlePage({ params, searchParams }: {
  params: { slug: string },
  searchParams: { from_page?: string }
}) {
  const supabase = createServerComponentClient({ cookies });

  // 遷移元ページ情報を取得
  const fromPage = searchParams.from_page || '';

  // 記事一覧へのURL生成
  const articlesUrl = fromPage ? `/articles?page=${fromPage}` : '/articles';

  // 制作物データを取得（キャッシュを使用せず常に最新データを取得）
  const { data: article, error } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', params.slug)
    .single();

  if (error || !article) {
    console.error('制作物の取得に失敗しました:', error);
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
  let heroImageUrl = null;
  if (article.hero_image_id) {
    console.log('制作物のメイン画像ID:', article.hero_image_id);

    const { data: mediaData } = await supabase
      .from('media')
      .select('url')
      .eq('id', article.hero_image_id)
      .single();

    if (mediaData) {
      // ストレージからURLを生成
      console.log('ヒーロー画像データ:', mediaData);
      console.log('ストレージ情報:', {
        url: mediaData.url
      }); // ストレージ情報を確認

      heroImageUrl = mediaData.url;
    }
  }

  // 制作物に添付されたファイルを取得
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
    <>
      {/* 構造化データ（JSON-LD） */}
      <Script
        id="structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": article.title,
            "image": [
              heroImageUrl || `${process.env.NEXT_PUBLIC_BASE_URL || 'https://katamari.jp'}/images/default-og-image.jpg`
            ],
            "datePublished": article.created_at,
            "dateModified": article.updated_at,
            "author": {
              "@type": "Person",
              "name": author?.name || "塊ユーザー",
              "url": `${process.env.NEXT_PUBLIC_BASE_URL || 'https://katamari.jp'}/profile/${article.author_id}`
            },
            "publisher": {
              "@type": "Organization",
              "name": "塊",
              "logo": {
                "@type": "ImageObject",
                "url": `${process.env.NEXT_PUBLIC_BASE_URL || 'https://katamari.jp  '}/logo.png`
              }
            },
            "description": article.content.replace(/<[^>]*>/g, '').substring(0, 160),
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": `${process.env.NEXT_PUBLIC_BASE_URL || 'https://katamari.jp'}/articles/${article.slug}`
            }
          })
        }}
      />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 制作物ヘッダー */}
        <header className="mb-8">
          <div className="flex items-center mb-4">
            <h1 className="text-3xl md:text-4xl font-bold">{article.title}</h1>
            {isDraft && isAuthor && (
              <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                非公開
              </span>
            )}
          </div>

          {/* 著者情報と制作物メタ情報 */}
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

          {/* ヒーロー画像 */}
          {heroImageUrl && (
            <div className="aspect-w-16 aspect-h-9 mb-6">
              <Image
                src={`${heroImageUrl}?t=${Date.now()}`}
                alt={article.title}
                width={1200}
                height={675}
                className="w-full h-full object-cover rounded-lg"
                unoptimized={true}
              />
            </div>
          )}
        </header>

        {/* 制作物本文 */}
        <div
          className="prose prose-lg max-w-none mb-12"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {/* ナビゲーションボタン */}
        <div className="mb-8">
          <NavigationButtons backHref={articlesUrl} backLabel="制作物一覧に戻る" />
        </div>

        {/* ファイルダウンローダー */}
        {downloadFiles && downloadFiles.length > 0 && (
          <div className="mt-8 border-t pt-8">
            <h2 className="text-2xl font-bold mb-4">ダウンロード</h2>
            <FileDownloader articleId={article.id} />
          </div>
        )}
      </div>
    </>
  );
} 