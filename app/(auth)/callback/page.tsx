'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientSupabase } from '@/lib/supabase-client';

export default function AuthCallbackPage() {
    const router = useRouter();

    useEffect(() => {
        const handleAuthCallback = async () => {
            try {
                const supabase = createClientSupabase();

                // URLからクエリパラメータを取得（Authorizationコードフロー）
                const { searchParams } = new URL(window.location.href);
                const code = searchParams.get('code');

                // codeパラメータがない場合は既に認証完了している可能性がある
                if (!code) {
                    router.push('/');
                    return;
                }

                // Authorization Code フロー
                const { error } = await supabase.auth.exchangeCodeForSession(code);

                if (error) {
                    // セッションが既に有効な場合のエラーは無視
                    if (error.message?.includes('invalid request') || error.message?.includes('code verifier')) {
                        // セッション確認
                        const { data: { session } } = await supabase.auth.getSession();
                        if (session) {
                            router.push('/');
                            return;
                        }
                    }

                    // 正常なエラーケース以外の場合のみスロー
                    throw error;
                }

                // ログイン成功時にホームにリダイレクト
                router.push('/');
            } catch {
                // 致命的なエラーのみログに記録
                router.push('/login?error=auth-callback-error');
            }
        };

        handleAuthCallback();
    }, [router]);

    return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">ログイン処理中...</h1>
                <p className="text-gray-600">しばらくお待ちください</p>
            </div>
        </div>
    );
} 