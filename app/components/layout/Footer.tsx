export default function Footer() {
    return (
        <footer className="bg-gray-100 py-6 mt-12">
            <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row justify-between items-center">
                    <div className="mb-4 md:mb-0">
                        <h3 className="text-xl font-bold text-pink-500">カタマリ</h3>
                        <p className="text-gray-600 mt-1">
                            3Dプリンターで面白い、かわいい、役に立つを共有するプラットフォーム
                        </p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 md:gap-8">
                        <div>
                            <h4 className="font-semibold mb-2">リンク</h4>
                            <ul className="space-y-1">
                                <li>
                                    <a href="/" className="text-gray-600 hover:text-pink-500">ホーム</a>
                                </li>
                                <li>
                                    <a href="/articles" className="text-gray-600 hover:text-pink-500">作れるもの一覧</a>
                                </li>
                                <li>
                                    <a href="/login" className="text-gray-600 hover:text-pink-500">ログイン</a>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold mb-2">連絡先</h4>
                            <ul className="space-y-1">
                                <li>
                                    <a href="mailto:info@katamari.jp" className="text-gray-600 hover:text-pink-500">
                                        info@katamari.jp
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-200 mt-6 pt-6 text-center">
                    <p className="text-sm text-gray-500">
                        © {new Date().getFullYear()} カタマリ - 面白い、かわいい、役に立つ、3Dプリンターデータ
                    </p>
                </div>
            </div>
        </footer>
    );
} 