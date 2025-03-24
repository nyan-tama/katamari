'use client';

import { Article } from '@/app/types/profile';
import Link from 'next/link';

interface ArticleListProps {
    articles: Article[];
}

export default function ArticleList({ articles }: ArticleListProps) {
    if (articles.length === 0) {
        return <p className="text-center text-gray-500">記事がありません</p>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
                <div key={article.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                    {/* サムネイル画像部分をリンクにする */}
                    <Link href={`/articles/${article.slug}`} className="block">
                        <div className="aspect-video bg-gray-100 relative w-full" style={{ paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
                            {article.hero_image_url ? (
                                <img
                                    src={article.hero_image_url}
                                    alt={article.title}
                                    className="absolute inset-0 w-full h-full object-cover"
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center h-full text-gray-400">
                                    <span className="text-4xl">📄</span>
                                </div>
                            )}
                            {/* 公開状態の表示を右上に配置 */}
                            <div
                                className={`absolute top-2 right-2 text-sm px-2 py-1 rounded ${article.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}
                            >
                                {article.status === 'published' ? '公開中' : '非公開'}
                            </div>
                        </div>
                    </Link>
                    <div className="p-4">
                        <h3 className="text-lg font-semibold mb-2">
                            <Link href={`/articles/${article.slug}`}>
                                {article.title}
                            </Link>
                        </h3>
                        {/* 他のコンテンツ */}
                    </div>
                </div>
            ))}
        </div>
    );
} 