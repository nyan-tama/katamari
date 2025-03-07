import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

export default async function ArticlesPage() {
    const supabase = createServerComponentClient({ cookies });

    // 公開されている記事一覧を取得
    const { data: articles } = await supabase
        .from('articles')
        .select(`
            *,
            profiles:user_id (
                username,
                avatar_url,
                display_name
            )
        `)
        .eq('status', 'published')
        .order('published_at', { ascending: false });

    return (
        <div className="container mx-auto px-4 py-8">
            <header className="mb-10 text-center">
                <h1 className="text-3xl font-bold text-gray-800 mb-4">記事一覧</h1>
                <p className="text-gray-600 max-w-2xl mx-auto">
                    3Dモデルの作り方、使い方、アイデアなど、クリエイターによる様々な記事をご覧ください。
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {articles?.map(article => (
                    <Link
                        key={article.id}
                        href={`/articles/${article.id}`}
                        className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                    >
                        <div className="relative w-full h-48">
                            {article.thumbnail_url ? (
                                <Image
                                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/article_thumbnails/${article.thumbnail_url}`}
                                    alt={article.title}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
                                    <span className="text-gray-500">No image</span>
                                </div>
                            )}
                        </div>

                        <div className="p-4">
                            <h2 className="text-xl font-semibold mb-2 line-clamp-2">{article.title}</h2>

                            {article.summary && (
                                <p className="text-gray-600 mb-4 text-sm line-clamp-3">{article.summary}</p>
                            )}

                            <div className="flex items-center justify-between text-sm text-gray-500">
                                <div className="flex items-center">
                                    {article.profiles.avatar_url && (
                                        <Image
                                            src={article.profiles.avatar_url}
                                            alt={article.profiles.display_name || article.profiles.username || ''}
                                            width={24}
                                            height={24}
                                            className="rounded-full mr-2"
                                        />
                                    )}
                                    <span>{article.profiles.display_name || article.profiles.username || '匿名'}</span>
                                </div>

                                <time dateTime={article.published_at}>
                                    {formatDistanceToNow(new Date(article.published_at), {
                                        addSuffix: true,
                                        locale: ja
                                    })}
                                </time>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="mt-12 text-center">
                <Link
                    href="/articles/new"
                    className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-md font-medium inline-block"
                >
                    記事を書く
                </Link>
            </div>
        </div>
    );
} 