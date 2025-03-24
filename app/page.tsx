import Link from "next/link";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import Image from "next/image";
import Script from "next/script";
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { Metadata } from 'next';

// ホームページの静的メタデータ
export const metadata: Metadata = {
  title: '塊 | 3Dプリンターデータ共有サイト',
  description: '3Dプリンターで作れるデータの共有サイト。初心者から上級者まで楽しめるプロジェクトが満載。あなたのデータを共有し、コミュニティとつながりましょう。',
  keywords: ['3Dプリンター', 'データ', 'ダウンロード', 'モデル', '無料', '共有', 'コミュニティ', 'STL', 'obj'],
  
  openGraph: {
    title: '塊 | 3Dプリンターデータ共有サイト',
    description: '3Dプリンターで作れるデータの共有サイト。初心者から上級者まで楽しめるプロジェクトが満載。',
    url: process.env.NEXT_PUBLIC_BASE_URL || 'https://katamari.jp',
    siteName: '塊 | 3Dプリンターモデル共有サイト',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://katamari.jp'}/images/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: '塊 | 3Dプリンターデータ共有サイト',
      }
    ],
  },
  
  twitter: {
    card: 'summary_large_image',
    title: '塊3Dプリンターデータ有ータイト',
    description: '3Dプリンターで作れるデータの共有サイト。あなたのデータを共有し、コミュニティとつながりましょう。',
    images: [`${process.env.NEXT_PUBLIC_BASE_URL || 'https://katamari.jp'}/images/twitter-card.jpg`],
  }
};

// 型定義
interface Article {
  id: string;
  title: string;
  content: string;
  hero_image_id: string | null;
  hero_image_url?: string | null; // 取得したURLを保存するためのフィールド
  status: string;
  created_at: string;
  author_id: string;
  view_count: number;
  download_count: number;
  updated_at: string;
  slug: string;
}

interface User {
  id: string;
  name: string;
  avatar_url: string | null;
  default_avatar_url?: string | null;
  avatar_storage_path?: string | null;
}

// 日付フォーマットヘルパー関数
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return formatDistanceToNow(date, { addSuffix: true, locale: ja });
};

// Supabaseストレージからの公開URL取得
const getPublicUrl = (bucket: string, path: string | null): string => {
  if (!path) return '';

  // パスが既に完全なURLの場合はそのまま返す
  if (path.startsWith('http')) {
    return path;
  }

  // テスト用データの場合はDhvkmイ側を優先する
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dhvkmwrudleimrzppamd.supabase.co';

  // キャッシュをバイパスするためのタイムスタンプパラメータを削除
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  const supabase = createServerComponentClient({ cookies });

  // 最新20件の公開記事を取得
  const { data: latestArticles, error } = await supabase
    .from('articles')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error("記事取得エラー:", error);
  }

  // データに型を指定
  const typedArticles = latestArticles as Article[] || [];

  // ヒーロー画像情報を取得
  if (typedArticles && typedArticles.length > 0) {
    const articleIds = typedArticles.filter(a => a.hero_image_id).map(a => a.hero_image_id);

    if (articleIds.length > 0) {
      const { data: mediaData, error: mediaError } = await supabase
        .from('article_media')
        .select('*')
        .in('id', articleIds);

      if (!mediaError && mediaData) {
        // メディア情報をマッピング
        const mediaMap = mediaData.reduce((acc, media) => {
          acc[media.id] = media;
          return acc;
        }, {} as Record<string, {
          id: string;
          storage_bucket: string;
          storage_path: string;
          [key: string]: unknown;
        }>);

        // 記事データにヒーロー画像URLを追加
        typedArticles.forEach(article => {
          if (article.hero_image_id && mediaMap[article.hero_image_id]) {
            const media = mediaMap[article.hero_image_id];

            // ストレージパスを適切にエンコード
            const encodedPath = media.storage_path
              .split('/')
              .map((segment: string) => encodeURIComponent(segment))
              .join('/');

            const { data } = supabase.storage
              .from(media.storage_bucket)
              .getPublicUrl(encodedPath);

            article.hero_image_url = data.publicUrl;
          }
        });
      } else if (mediaError) {
        console.error('ヒーロー画像の取得に失敗しました:', mediaError);
      }
    }
  }

  // 著者のIDを取得
  const authorIds = typedArticles?.map(article => article.author_id) || [];

  // 著者情報を取得
  const { data: authors } = await supabase
    .from('users')
    .select('*')
    .in('id', authorIds);

  // 著者情報をマッピング
  const authorsMap: Record<string, User> = {};
  authors?.forEach(author => {
    authorsMap[author.id] = author;
  });

  console.log('著者情報:', authorsMap);
  console.log('記事データ:', typedArticles);

  return (
    <>
      {/* ウェブサイトの構造化データ */}
      <Script
        id="structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "カタマリ | 3Dプリンターモデル共有サイト",
            "url": process.env.NEXT_PUBLIC_BASE_URL || "https://katamari-3d.vercel.app",
            "potentialAction": {
              "@type": "SearchAction",
              "target": `${process.env.NEXT_PUBLIC_BASE_URL || 'https://katamari-3d.vercel.app'}/articles?search={search_term_string}`,
              "query-input": "required name=search_term_string"
            },
            "description": "3Dプリンターで作れるモデルの共有サイト。初心者から上級者まで楽しめるプロジェクトが満載。",
            "publisher": {
              "@type": "Organization",
              "name": "カタマリ",
              "logo": {
                "@type": "ImageObject",
                "url": `${process.env.NEXT_PUBLIC_BASE_URL || 'https://katamari-3d.vercel.app'}/logo.png`
              }
            }
          })
        }}
      />

      <main className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {/* ヒーローセクション */}
          <section className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-8 md:p-12 mb-12">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 mb-4">
                3Dプリント関連の知識・経験・制作物を共有しよう
              </h1>
              <p className="text-lg md:text-xl text-gray-600 mb-8">
                「カタマリ」は、あなたの創作体験や知識を共有する<br className="hidden md:block" />
                3Dプリントコミュニティプラットフォームです
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/articles"
                  className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-lg font-medium text-lg transition-colors"
                >
                  記事を探す
                </Link>
                <Link
                  href="/login"
                  className="bg-white hover:bg-gray-100 text-pink-500 border border-pink-500 px-6 py-3 rounded-lg font-medium text-lg transition-colors"
                >
                  投稿する
                </Link>
              </div>
            </div>
          </section>

          {/* 最新の記事セクション */}
          <section className="mb-16">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">新着記事</h2>
              <Link href="/articles" className="text-pink-500 hover:text-pink-600">
                すべて見る →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {typedArticles && typedArticles.map((article) => (
                <Link key={article.id} href={`/articles/${article.slug}`} className="group">
                  <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                    <div className="w-full h-48 bg-gray-100 relative overflow-hidden">
                      {article.hero_image_url ? (
                        <Image
                          src={article.hero_image_url}
                          alt={article.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover"
                          priority={true}
                          unoptimized={true}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                          <span className="text-4xl">📷</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium text-gray-800 mb-1 group-hover:text-pink-500 transition-colors truncate">
                        {article.title}
                      </h3>
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full overflow-hidden mr-2">
                          {authorsMap[article.author_id]?.avatar_storage_path ? (
                            // Supabaseにアップロードされたカスタムアバター
                            <Image
                              src={getPublicUrl('avatars', authorsMap[article.author_id]?.avatar_storage_path || '')}
                              alt={authorsMap[article.author_id]?.name || '不明なユーザー'}
                              width={32}
                              height={32}
                              className="w-full h-full object-cover"
                              unoptimized={true}
                            />
                          ) : authorsMap[article.author_id]?.default_avatar_url ? (
                            // OAuth経由のアバター（GoogleやGitHubなど）
                            <Image
                              src={authorsMap[article.author_id]?.default_avatar_url || ''}
                              alt={authorsMap[article.author_id]?.name || '不明なユーザー'}
                              width={32}
                              height={32}
                              className="w-full h-full object-cover"
                              unoptimized={true}
                            />
                          ) : (
                            // デフォルトアバター（イニシャル）
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-600">
                              {authorsMap[article.author_id]?.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                          )}
                        </div>
                        <span className="text-sm text-gray-700">{authorsMap[article.author_id]?.name || '不明なユーザー'}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <p className="text-xs text-gray-500">{formatDate(article.created_at)}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* bambooサイトへのリンクセクション */}
          <section className="mb-16">
            <div className="bg-gradient-to-r from-green-50 via-blue-50 to-pink-50 p-8 rounded-xl shadow-md border-2 border-pink-300">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-blue-600 mb-3">✨ Bambu Labの3Dプリンターで作ろう ✨</h2>
                  <p className="text-gray-600 mb-6 text-lg">
                    カタマリの記事で紹介されているモデルは、高品質な3Dプリンターで出力するとさらに美しく仕上がります。Bambu Labの製品なら、誰でも簡単に高精度な3D印刷が可能です♪
                  </p>
                  <a
                    href="https://jp.store.bambulab.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white px-6 py-3 rounded-lg font-medium inline-block transition-colors shadow-md transform hover:scale-105 transition-transform duration-300"
                  >
                    🛒 Bambu Lab公式ストアを見る
                  </a>
                </div>
                <div className="flex items-center justify-center">
                  <div className="w-44 h-44 rounded-full overflow-hidden relative bg-white border-4 border-green-200 shadow-lg transform hover:rotate-3 transition-transform duration-300" style={{ boxShadow: '0 0 20px rgba(110, 231, 183, 0.5)' }}>
                    <Image
                      src="https://jp.store.bambulab.com/cdn/shop/products/A1-2_1400x.png?v=1703150110"
                      alt="Bambu Lab 3Dプリンター"
                      fill
                      className="object-contain p-2"
                      unoptimized={true}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="py-12">
            <div className="container mx-auto px-4">
              <h1 className="text-4xl font-bold text-center mb-6">
                3Dプリントで、共有する喜び
              </h1>
              <p className="text-xl text-center text-gray-600 mb-12 max-w-3xl mx-auto">
                カタマリは、3Dプリントに関する知識・経験・制作物を共有できるプラットフォーム。
                あなたの創作体験をみんなで共有しましょう。
              </p>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
