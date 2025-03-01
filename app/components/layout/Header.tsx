'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

export default function Header() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        // ユーザーのセッション情報を取得
        const getUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user || null);
            setLoading(false);
        };

        getUser();

        // ログイン状態の変化を監視
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
        await supabase.auth.signOut();
    };

    return (
        <header className="bg-white shadow-md">
            <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                <Link href="/" className="text-2xl font-bold text-pink-500">
                    カタワク
                </Link>

                <nav className="flex items-center gap-6">
                    <Link href="/" className="text-gray-700 hover:text-pink-500">
                        ホーム
                    </Link>

                    {!loading && (
                        <>
                            {user ? (
                                <>
                                    <Link href="/upload" className="text-gray-700 hover:text-pink-500">
                                        アップロード
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