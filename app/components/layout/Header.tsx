'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClientSupabase } from '@/lib/supabase-client';
import { User } from '@supabase/supabase-js';

export default function Header() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        // ユーザーのセッション情報を取得
        const getUser = async () => {
            const supabase = createClientSupabase();
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user || null);
            setLoading(false);
        };

        getUser();

        // ログイン状態の変化を監視
        const supabase = createClientSupabase();
        const { data: authListener } = supabase.auth.onAuthStateChange(
            (event, session) => {
                setUser(session?.user || null);
            }
        );

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const handleLogout = async () => {
        const supabase = createClientSupabase();
        await supabase.auth.signOut();
    };

    return (
        <header className="bg-white shadow-md">
            <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                <Link href="/" className="text-xl font-bold text-gray-900 flex items-center">
                    <span className="mr-2">🧩</span>
                    カタマリ
                </Link>

                <nav className="flex items-center gap-6">
                    <Link href="/" className="text-gray-700 hover:text-pink-500">
                        ホーム
                    </Link>
                    
                    <Link href="/articles" className="text-gray-700 hover:text-pink-500">
                        記事一覧
                    </Link>

                    {!loading && (
                        <>
                            {user ? (
                                <>
                                    <Link href="/articles/new" className="text-gray-700 hover:text-pink-500">
                                        記事作成
                                    </Link>
                                    <Link href="/profile" className="text-gray-700 hover:text-pink-500">
                                        マイページ
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-md"
                                    >
                                        ログアウト
                                    </button>
                                </>
                            ) : (
                                <Link
                                    href="/login"
                                    className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-md"
                                >
                                    ログイン
                                </Link>
                            )}
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
} 