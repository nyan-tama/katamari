import Link from "next/link";

export default function Home() {
  // 仮のモデルデータ
  const featuredModels = [
    {
      id: "1",
      title: "かわいいクッキー型",
      imageUrl: "/images/sample1.jpg",
      creator: "カタワク公式"
    },
    {
      id: "2",
      title: "チョコレート型セット",
      imageUrl: "/images/sample2.jpg",
      creator: "クリエイターA"
    },
    {
      id: "3",
      title: "ユニークな手作りケーキ型",
      imageUrl: "/images/sample3.jpg",
      creator: "クリエイターB"
    },
    {
      id: "4",
      title: "季節の和菓子型",
      imageUrl: "/images/sample4.jpg",
      creator: "クリエイターC"
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* ヒーローセクション */}
      <section className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-8 md:p-12 mb-12">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 mb-4">
            かわいい・おもしろい3Dモデルをみんなで共有しよう
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-8">
            「カタワク」は、食品関連の型枠（クッキー型、チョコレート型など）に特化した<br className="hidden md:block" />
            感性志向型3Dモデル共有プラットフォームです。
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

      {/* 特集モデルセクション */}
      <section className="mb-16">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">人気の型枠モデル</h2>
          <Link href="/models" className="text-pink-500 hover:text-pink-600">
            すべて見る →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredModels.map((model) => (
            <Link key={model.id} href={`/models/${model.id}`} className="group">
              <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                <div className="aspect-square relative bg-gray-100">
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    準備中...
                  </div>
                  {/* <Image 
                    src={model.imageUrl} 
                    alt={model.title} 
                    fill 
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  /> */}
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-gray-800 mb-1 group-hover:text-pink-500 transition-colors">
                    {model.title}
                  </h3>
                  <p className="text-gray-500 text-sm">
                    作成者: {model.creator}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 特徴セクション */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-pink-500 text-2xl">✨</span>
          </div>
          <h3 className="text-xl font-semibold mb-2">かわいさ重視</h3>
          <p className="text-gray-600">
            実用性だけでなく、見た目の「かわいさ」「おもしろさ」にこだわったモデルを共有できます。
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-pink-500 text-2xl">🍪</span>
          </div>
          <h3 className="text-xl font-semibold mb-2">食品関連に特化</h3>
          <p className="text-gray-600">
            クッキー型やチョコレート型など、食べ物に関連する型枠のモデルが充実しています。
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-pink-500 text-2xl">🇯🇵</span>
          </div>
          <h3 className="text-xl font-semibold mb-2">日本語ネイティブ</h3>
          <p className="text-gray-600">
            日本人ユーザーのための、使いやすい日本語インターフェースを提供しています。
          </p>
        </div>
      </section>
    </div>
  );
}
