'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientSupabase } from '@/lib/supabase-client';

export default function AuthCallbackPage() {
    const router = useRouter();

    useEffect(() => {
        // URLからハッシュを取得し、セッションを確立
        const handleAuthCallback = async () => {
            try {
                const supabase = createClientSupabase();
                // コールバックパラメータからセッションを交換
                const { searchParams } = new URL(window.location.href);
                const code = searchParams.get('code');

                if (code) {
                    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

                    if (error) throw error;

                    // セッションが確立されたらユーザー情報を取得
                    const user = data.user;

                    if (user) {
                        // public.usersテーブルにユーザーが存在するか確認
                        const { data: existingUser } = await supabase
                            .from('users')
                            .select('*')
                            .eq('id', user.id)
                            .single();

                        // 存在しない場合は新規作成
                        if (!existingUser) {
                            await supabase.from('users').insert({
                                id: user.id,
                                email: user.email ?? '',
                                name: user.user_metadata.full_name || user.email?.split('@')[0] || 'User',
                                avatar_url: user.user_metadata.avatar_url
                            });
                        }
                    }
                }

                // ログイン成功時にホームにリダイレクト
                router.push('/');
            } catch (error) {
                console.error('Error handling auth callback:', error);
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