import Link from 'next/link';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { formatDistance } from 'date-fns';
import { ja } from 'date-fns/locale';
import Image from 'next/image';
import { PlusIcon } from '@heroicons/react/24/outline';

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
  slug: string;
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

  // 公開されている記事を取得
  const { data: articles, error } = await supabase
    .from('articles')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('記事の取得に失敗しました:', error);
    return <div>記事の読み込み中にエラーが発生しました。</div>;
  }

  // メイン画像の情報を取得
  const articleIds = articles.filter(a => a.hero_image_id).map(a => a.hero_image_id);

  if (articleIds.length > 0) {
    const { data: mediaData, error: mediaError } = await supabase
      .from('article_media')
      .select('*')
      .in('id', articleIds);

    if (mediaError) {
      console.error('メイン画像の取得に失敗しました:', mediaError);
    } else if (mediaData) {
      // メディア情報をマッピング
      const mediaMap = mediaData.reduce((acc, media) => {
        acc[media.id] = media;
        return acc;
      }, {} as Record<string, any>);

      // 記事データにメイン画像URLを追加
      articles.forEach(article => {
        if (article.hero_image_id && mediaMap[article.hero_image_id]) {
          const media = mediaMap[article.hero_image_id];

          // Supabase Storageから公開URLを取得
          const { data } = supabase.storage
            .from(media.storage_bucket)
            .getPublicUrl(media.storage_path);

          article.hero_image_url = data.publicUrl;
        }
      });
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
        <h1 className="text-3xl font-bold">作れるもの一覧</h1>
        <Link
          href="/articles/new"
          className="inline-flex items-center gap-1 px-4 py-2 bg-secondary text-white rounded-full hover:bg-opacity-90 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          新規データの登録
        </Link>
      </div>

      {articles.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg text-gray-600">作れるものはまだありません。</p>
          <p className="mt-2 text-gray-500">
            最初の作れるものを登録してみましょう！
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <Link key={article.id} href={`/articles/${article.slug}`} className="group">
              <div className="bg-card rounded-lg overflow-hidden shadow-sm border border-border hover:shadow-md transition-all">
                {/* メイン画像 */}
                <div className="w-full h-48 bg-gray-light relative overflow-hidden">
                  {article.hero_image_url ? (
                    <Image
                      src={article.hero_image_url}
                      alt={article.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover"
                      loading="lazy"
                      quality={80}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-light">
                      <span className="text-4xl">📦</span>
                    </div>
                  )}
                </div>

                {/* 記事情報 */}
                <div className="p-4">
                  <h3 className="font-medium text-card-foreground mb-1 group-hover:text-primary transition-colors truncate">
                    {article.title}
                  </h3>

                  {/* 著者情報 */}
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
                    <p className="text-xs text-gray-dark">
                      {formatDistance(new Date(article.created_at), new Date(), {
                        addSuffix: true,
                        locale: ja,
                      })}
                    </p>
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