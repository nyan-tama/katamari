import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ArticleContent from '@/components/articles/ArticleContent';
import RelatedModels from '@/components/articles/RelatedModels';
import AuthorInfo from '@/components/articles/AuthorInfo';
import ShareButtons from '@/components/shared/ShareButtons';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

export default async function ArticlePage({ params }: { params: { id: string } }) {
    const supabase = createServerComponentClient({ cookies });

    // 記事データの取得
    const { data: article, error } = await supabase
        .from('articles')
        .select(`
            *,
            profiles:user_id (
                username,
                avatar_url,
                display_name
            )
        `)
        .eq('id', params.id)
        .single();

    if (error || !article) {
        notFound();
    }

    // 公開されている記事のみ表示（作成者は下書きも閲覧可能）
    const { data: { session } } = await supabase.auth.getSession();
    const isAuthor = session?.user?.id === article.user_id;

    if (article.status !== 'published' && !isAuthor) {
        notFound();
    }

    // 閲覧数の更新（作成者による閲覧はカウントしない）
    if (!isAuthor) {
        await supabase
            .from('articles')
            .update({ view_count: (article.view_count || 0) + 1 })
            .eq('id', params.id);
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-3xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-4">{article.title}</h1>

                    <div className="flex items-center justify-between text-gray-500 text-sm mb-6">
                        <AuthorInfo user={article.profiles} />

                        <time dateTime={article.published_at || article.created_at}>
                            {formatDistanceToNow(new Date(article.published_at || article.created_at), {
                                addSuffix: true,
                                locale: ja
                            })}
                        </time>
                    </div>

                    {article.thumbnail_url && (
                        <div className="relative w-full h-64 md:h-96 rounded-lg overflow-hidden mb-6">
                            <Image
                                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/article_thumbnails/${article.thumbnail_url}`}
                                alt={article.title}
                                fill
                                className="object-cover"
                                priority
                            />
                        </div>
                    )}

                    {article.summary && (
                        <div className="bg-gray-50 p-4 rounded-lg mb-6 text-gray-700 italic">
                            {article.summary}
                        </div>
                    )}
                </header>

                <main className="mb-12">
                    <ArticleContent content={article.content} />
                </main>

                <footer>
                    <div className="border-t border-gray-200 pt-6 mb-8">
                        <ShareButtons
                            title={article.title}
                            url={`${process.env.NEXT_PUBLIC_SITE_URL}/articles/${article.id}`}
                        />
                    </div>

                    <RelatedModels articleId={article.id} />

                    {isAuthor && (
                        <div className="mt-8 flex justify-end">
                            <Link
                                href={`/articles/${article.id}/edit`}
                                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded"
                            >
                                編集する
                            </Link>
                        </div>
                    )}
                </footer>
            </div>
        </div>
    );
} 