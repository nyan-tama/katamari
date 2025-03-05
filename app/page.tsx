import Link from "next/link";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import Image from "next/image";
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

// 型定義
interface Model {
  id: string;
  title: string;
  description?: string;
  file_url: string;
  thumbnail_url?: string;
  created_at: string;
  user_id: string;
}

interface User {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface ModelWithUser extends Model {
  users: User;
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

  // 最新20件のモデルを取得
  const { data: latestModels, error } = await supabase
    .from('models')
    .select(`*, users(id, name, avatar_url)`)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error("モデル取得エラー:", error);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* ヒーローセクション */}
      <section className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-8 md:p-12 mb-12">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 mb-4">
            かわいい・おもしろい3Dモデルをみんなで共有しよう
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-8">
            「カタワク」は、あなたの可愛い・面白いをカタチにする<br className="hidden md:block" />
            3Dモデルサイトです
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/models"
              className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-lg font-medium text-lg transition-colors"
            >
              モデルを探す
            </Link>
            <Link
              href="/login"
              className="bg-white hover:bg-gray-100 text-pink-500 border border-pink-500 px-6 py-3 rounded-lg font-medium text-lg transition-colors"
            >
              アップロードする
            </Link>
          </div>
        </div>
      </section>

      {/* 最新のモデルセクション */}
      <section className="mb-16">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">新着モデル</h2>
          <Link href="/models" className="text-pink-500 hover:text-pink-600">
            すべて見る →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {latestModels && latestModels.map((model: ModelWithUser) => (
            <Link key={model.id} href={`/models/${model.id}`} className="group">
              <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                <div className="w-full h-48 bg-gray-100 relative overflow-hidden">
                  {model.thumbnail_url ? (
                    <Image
                      src={getPublicUrl('model_thumbnails', model.thumbnail_url)}
                      alt={model.title}
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
                    {model.title}
                  </h3>
                  <div className="flex items-center mt-2">
                    <div className="w-6 h-6 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
                      {model.users.avatar_url ? (
                        <Image
                          src={model.users.avatar_url.startsWith('http')
                            ? model.users.avatar_url
                            : getPublicUrl('avatars', model.users.avatar_url)}
                          alt={model.users.name}
                          width={24}
                          height={24}
                          className="object-cover"
                          unoptimized={true}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                          {model.users.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                    <span className="ml-2 text-sm text-gray-600">{model.users.name}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{formatDate(model.created_at)}</p>
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
                カタワクのモデルは、高品質な3Dプリンターで出力するとさらに美しく仕上がります。Bambu Labの製品なら、誰でも簡単に高精度な3D印刷が可能です♪
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
    </div>
  );
}
