export default function Footer() {
    return (
        <footer className="bg-gray-light py-10 mt-12 border-t border-border">
            <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row justify-between items-center">
                    <div className="mb-4 md:mb-0">
                        <h3 className="text-xl font-bold text-primary">カタマリ</h3>
                        <p className="text-gray-dark mt-1">
                            3Dプリンターで面白い、かわいい、役に立つを共有するプラットフォーム
                        </p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 md:gap-8">
                        <div>
                            <h4 className="font-semibold mb-2 text-gray-dark">リンク</h4>
                            <ul className="space-y-1">
                                <li>
                                    <a href="/" className="text-gray-dark hover:text-primary transition-colors">ホーム</a>
                                </li>
                                <li>
                                    <a href="/articles" className="text-gray-dark hover:text-primary transition-colors">作れるもの一覧</a>
                                </li>
                                <li>
                                    <a href="/login" className="text-gray-dark hover:text-primary transition-colors">ログイン</a>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold mb-2 text-gray-dark">連絡先</h4>
                            <ul className="space-y-1">
                                <li>
                                    <a href="mailto:info@katamari.jp" className="text-gray-dark hover:text-primary transition-colors">
                                        info@katamari.jp
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="border-t border-border mt-6 pt-6 text-center">
                    <p className="text-sm text-gray-dark">
                        © {new Date().getFullYear()} カタマリ - 面白い、かわいい、役に立つ、3Dプリンターデータ
                    </p>
                </div>
            </div>
        </footer>
    );
} 