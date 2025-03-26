'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClientSupabase } from '@/lib/supabase-client';
import { User } from '@supabase/supabase-js';
import { PlusIcon } from '@heroicons/react/24/outline';

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
        <header className="bg-card shadow-sm border-b border-border sticky top-0 z-10">
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                <Link href="/" className="text-xl font-bold text-primary flex items-center">
                    カタマリ
                </Link>

                <nav className="flex items-center gap-6">
                    <Link href="/" className="text-card-foreground hover:text-primary transition-colors">
                        ホーム
                    </Link>

                    <Link href="/articles" className="text-card-foreground hover:text-primary transition-colors">
                        作れるもの一覧
                    </Link>

                    {!loading && (
                        <>
                            {user ? (
                                <>
                                    <Link
                                        href="/articles/new"
                                        className="flex items-center gap-1 px-4 py-2 text-white bg-secondary rounded-full hover:bg-opacity-90 transition-colors"
                                    >
                                        <PlusIcon className="h-5 w-5" />
                                        データの登録
                                    </Link>
                                    <Link href="/profile" className="text-card-foreground hover:text-primary transition-colors">
                                        マイページ
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="bg-secondary hover:bg-opacity-90 text-white px-4 py-2 rounded-md transition-colors"
                                    >
                                        ログアウト
                                    </button>
                                </>
                            ) : (
                                <Link
                                    href="/login"
                                    className="bg-primary hover:bg-primary-light text-white px-4 py-2 rounded-md transition-colors"
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