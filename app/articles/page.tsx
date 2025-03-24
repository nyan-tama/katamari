import Link from 'next/link';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { formatDistance } from 'date-fns';
import { ja } from 'date-fns/locale';
import Image from 'next/image';
import type { Metadata } from 'next';

// 記事一覧ページの静的メタデータ
export const metadata: Metadata = {
  title: '制作物一覧 | 塊',
  description: '3Dプリンターデータに関するプロジェクトを探しましょう。初心者向けのチュートリアルから上級者向けのテクニックまで様々な制作物があります。',
  keywords: ['3Dプリンター', 'データ', 'ダウンロード', 'モデル', '無料', '制作物一覧', 'チュートリアル'],
  
  openGraph: {
    title: '制作物一覧 | 塊',
    description: '3Dプリンターデータに関するプロジェクトを探しましょう。初心者向けのチュートリアルから上級者向けのテクニックまで様々な制作物があります。',
    url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://katamari.jp'}/articles`,
    siteName: '塊 | 3Dプリンターデータ共有サイト',
    locale: 'ja_JP',
    type: 'website',
  },
  
  twitter: {
    card: 'summary',
    title: '制作物一覧 | 塊',
    description:'3Dプリンターデータに関するプロジェクトを探しましょう。',
  }
};

// 型定義
interface Article {
  id: string;
  title: string;
  hero_image_id: string | null;
  hero_image_url?: string | null; // 取得したURLを保存するための追加フィールド
  created_at: string;
  author_id: string;
  view_count: number;
  download_count: number;
  slug: string; // slugプロパティを追加
}

interface Author {
  id: string;
  name: string;
  avatar_url: string | null;
  default_avatar_url?: string | null;
  avatar_storage_path?: string | null;
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

export default async function ArticlesPage({ searchParams }: { searchParams: { page?: string } }) {
  const supabase = createServerComponentClient({ cookies });

  // 現在のページを取得
  const currentPage = searchParams.page || '1';

  // 公開されている制作物を取得
  const { data: articles, error } = await supabase
    .from('articles')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('制作物の取得に失敗しました:', error);
    return <div>制作物の読み込み中にエラーが発生しました。</div>;
  }

  // メイン画像の情報を取得
  const articleIds = articles.filter(a => a.hero_image_id).map(a => a.hero_image_id);

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

      // 制作物データにメイン画像URLを追加
      articles.forEach(article => {
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

  // 著者情報を取得
  const authorIds = Array.from(new Set(articles.map((article) => article.author_id)));

  // 著者情報マップを準備
  const authorsMap: Record<string, Author> = {};

  if (authorIds.length > 0) {
    // トップページと同じ方法で著者情報を取得（全フィールドを取得）
    const { data: authors } = await supabase
      .from('users')
      .select('*')
      .in('id', authorIds);

    // トップページと同じシンプルなマッピング方法を採用
    authors?.forEach(author => {
      authorsMap[author.id] = author;
    });
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">制作物一覧</h1>
        <Link
          href="/articles/new"
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          新規制作物作成
        </Link>
      </div>

      {articles.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg text-gray-600">制作物はまだありません。</p>
          <p className="mt-2 text-gray-500">
            最初の制作物を作成してみましょう！
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <Link key={article.id} href={`/articles/${article.slug}?from_page=${currentPage}`} className="block">
              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                {/* メイン画像 */}
                <div className="aspect-w-16 aspect-h-9">
                  {article.hero_image_url ? (
                    <Image
                      src={article.hero_image_url}
                      alt={article.title}
                      width={600}
                      height={338}
                      className="w-full h-full object-cover"
                      unoptimized={true}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500">
                      画像なし
                    </div>
                  )}
                </div>

                {/* 制作物情報 */}
                <div className="p-4">
                  <h2 className="text-xl font-semibold mb-2 line-clamp-2 hover:text-indigo-600">
                    {article.title}
                  </h2>

                  {/* 著者情報 */}
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden mr-2 border border-gray-300 shadow-sm">
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
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs text-gray-600 border border-gray-200">
                          {authorsMap[article.author_id]?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                    <span className="text-sm text-gray-600">{authorsMap[article.author_id]?.name || '不明なユーザー'}</span>
                  </div>

                  {/* メタデータ */}
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>
                      {formatDistance(new Date(article.created_at), new Date(), {
                        addSuffix: true,
                        locale: ja,
                      })}
                    </span>
                    {/* 閲覧数とダウンロード数は非表示（裏で管理するだけ） */}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
} 