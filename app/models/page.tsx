import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
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

// モデル一覧ページ
export default async function ModelsPage() {
  const supabase = createServerComponentClient({ cookies });

  // すべてのモデルを新着順に取得
  const { data: models, error } = await supabase
    .from('models')
    .select(`*, users(id, name, avatar_url)`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("モデル取得エラー:", error);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">モデル一覧</h1>
        <p className="text-gray-600">カタワクに投稿されたすべてのモデルを新着順で表示しています。</p>
      </div>

      {/* 将来的なフィルター機能用のプレースホルダー */}
      <div className="bg-gray-50 p-4 rounded-lg mb-8 flex flex-wrap gap-4 items-center">
        <span className="font-medium text-gray-700">並び順:</span>
        <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm font-medium">新着順</span>

        {/* 将来的に実装予定のフィルターボタン（現在は非アクティブ） */}
        <span className="text-gray-400 px-3 py-1 rounded-full text-sm font-medium border border-gray-200 cursor-not-allowed">人気順</span>
        <span className="text-gray-400 px-3 py-1 rounded-full text-sm font-medium border border-gray-200 cursor-not-allowed">ランダム</span>
      </div>

      {/* モデル一覧表示 */}
      {models && models.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {models.map((model: ModelWithUser) => (
            <Link key={model.id} href={`/models/${model.id}`} className="group">
              <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                {/* サムネイル画像コンテナ */}
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
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <span className="text-4xl">📷</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h2 className="text-lg font-medium text-gray-900 group-hover:text-pink-600 transition-colors truncate">{model.title}</h2>
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
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-400 text-5xl mb-4">📦</div>
          <h3 className="text-xl font-medium text-gray-700 mb-2">モデルがまだ登録されていません</h3>
          <p className="text-gray-500 mb-6">最初のモデルをアップロードしてみませんか？</p>
          <Link href="/upload" className="bg-pink-500 hover:bg-pink-600 text-white font-medium py-2 px-6 rounded-lg transition-colors">
            モデルをアップロード
          </Link>
        </div>
      )}
    </div>
  );
} 