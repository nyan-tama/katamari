import Link from "next/link";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import Image from "next/image";
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

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

  // メイン画像情報を取得
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

        // 記事データにメイン画像URLを追加
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
        console.error('メイン画像の取得に失敗しました:', mediaError);
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

  return (
    <div className="container mx-auto px-4 py-8">
      {/* ヒーローセクション */}
      <section className="bg-gradient-to-r from-gray-light to-card rounded-xl p-8 md:p-12 mb-12 shadow-sm border border-border">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-dark mb-4">
            3Dプリンターのデータで面白い、かわいい、役に立つを共有しよう
          </h1>
          <p className="text-lg md:text-xl text-gray-dark mb-8">
            「カタマリ」は、3Dプリンターで印刷できるデータや作り方を共有するプラットフォームです
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/articles"
              className="bg-primary hover:bg-primary-light text-white px-6 py-3 rounded-lg font-medium text-lg transition-colors"
            >
              作れるものを探す
            </Link>
          </div>
        </div>
      </section>

      {/* 最新の記事セクション */}
      <section className="mb-16">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-foreground">新着 作れるもの</h2>
          <Link href="/articles" className="text-primary hover:text-primary-light transition-colors">
            すべて見る →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {typedArticles && typedArticles.map((article, index) => (
            <Link key={article.id} href={`/articles/${article.slug}`} className="group">
              <div className="bg-card rounded-lg overflow-hidden shadow-sm border border-border hover:shadow-md transition-all">
                <div className="w-full h-48 bg-gray-light relative overflow-hidden">
                  {article.hero_image_url ? (
                    <Image
                      src={article.hero_image_url}
                      alt={article.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      className="object-cover"
                      priority={index < 4}
                      quality={85}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-light">
                      <span className="text-4xl">📦</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-card-foreground mb-1 group-hover:text-primary transition-colors truncate">
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
                          quality={75}
                        />
                      ) : authorsMap[article.author_id]?.default_avatar_url ? (
                        // OAuth経由のアバター（GoogleやGitHubなど）
                        <Image
                          src={authorsMap[article.author_id]?.default_avatar_url || ''}
                          alt={authorsMap[article.author_id]?.name || '不明なユーザー'}
                          width={32}
                          height={32}
                          className="w-full h-full object-cover"
                          quality={75}
                        />
                      ) : (
                        // デフォルトアバター（イニシャル）
                        <div className="w-full h-full bg-gray-light flex items-center justify-center text-gray-600">
                          {authorsMap[article.author_id]?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                    <span className="text-sm text-gray-dark">{authorsMap[article.author_id]?.name || '不明なユーザー'}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <p className="text-xs text-gray-dark">{formatDate(article.created_at)}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* bambooサイトへのリンクセクション */}
      <section className="mb-16">
        <div className="bg-card p-8 rounded-xl shadow-sm border border-border">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-accent mb-3">✨ Bambu Labの3Dプリンターで作ろう ✨</h2>
              <p className="text-card-foreground mb-6 text-lg">
                カタマリで紹介されている作れるものは、高品質な3Dプリンターで出力するとさらに美しく仕上がります。Bambu Labの製品なら、誰でも簡単に高精度な3D印刷が可能です♪
              </p>
              <a
                href="https://jp.store.bambulab.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-secondary hover:bg-opacity-90 text-white px-6 py-3 rounded-lg font-medium inline-block transition-all shadow-md hover:shadow-lg"
              >
                🛒 Bambu Lab公式ストアを見る
              </a>
            </div>
            <div className="flex items-center justify-center">
              <div className="w-44 h-44 rounded-full overflow-hidden relative bg-white border-2 border-primary transform hover:rotate-3 transition-transform duration-300">
                <Image
                  src="https://jp.store.bambulab.com/cdn/shop/products/A1-2_1400x.png?v=1703150110"
                  alt="Bambu Lab 3Dプリンター"
                  fill
                  className="object-contain p-2"
                  quality={85}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
