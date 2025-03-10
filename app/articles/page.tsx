import Link from 'next/link';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { formatDistance } from 'date-fns';
import { ja } from 'date-fns/locale';
import Image from 'next/image';

// 記事の型定義
interface Article {
  id: string;
  title: string;
  hero_image: string | null;
  created_at: string;
  author_id: string;
  view_count: number;
  download_count: number;
}

// 著者の型定義
interface Author {
  id: string;
  name: string;
  avatar_url: string | null;
}

// ArticleCard コンポーネント
function ArticleCard({ article, author }: { article: Article; author: Author }) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* ヒーロー画像 */}
      <div className="aspect-w-16 aspect-h-9">
        {article.hero_image ? (
          <Image
            src={article.hero_image}
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

      {/* 記事情報 */}
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-2 line-clamp-2">
          <Link href={`/articles/${article.id}`} className="hover:text-indigo-600">
            {article.title}
          </Link>
        </h2>

        {/* 著者情報 */}
        <div className="flex items-center mb-3">
          <div className="w-8 h-8 rounded-full overflow-hidden mr-2">
            {author.avatar_url ? (
              <Image
                src={author.avatar_url}
                alt={author.name}
                width={32}
                height={32}
                className="w-full h-full object-cover"
                unoptimized={true}
              />
            ) : (
              <div className="w-full h-full bg-gray-300 flex items-center justify-center text-xs text-gray-600">
                {author.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <span className="text-sm text-gray-600">{author.name}</span>
        </div>

        {/* メタデータ */}
        <div className="flex justify-between text-xs text-gray-500">
          <span>
            {formatDistance(new Date(article.created_at), new Date(), {
              addSuffix: true,
              locale: ja,
            })}
          </span>
          <div className="flex gap-2">
            <span>👁️ {article.view_count}</span>
            <span>⬇️ {article.download_count}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function ArticlesPage() {
  const supabase = createServerComponentClient({ cookies });
  
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

  // 著者情報を取得
  const authorIds = Array.from(new Set(articles.map((article) => article.author_id)));
  const { data: authors, error: authorsError } = await supabase
    .from('users')
    .select('*')
    .in('id', authorIds);

  if (authorsError) {
    console.error('著者情報の取得に失敗しました:', authorsError);
    return <div>著者情報の読み込み中にエラーが発生しました。</div>;
  }

  // 著者情報をマッピング
  const authorsMap = authors.reduce((acc, author) => {
    acc[author.id] = author;
    return acc;
  }, {} as Record<string, Author>);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">記事一覧</h1>
        <Link
          href="/articles/new"
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          新規記事作成
        </Link>
      </div>

      {articles.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg text-gray-600">記事はまだありません。</p>
          <p className="mt-2 text-gray-500">
            最初の記事を作成してみましょう！
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              author={authorsMap[article.author_id]}
            />
          ))}
        </div>
      )}
    </div>
  );
} 