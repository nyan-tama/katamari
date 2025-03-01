'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
    const router = useRouter();

    useEffect(() => {
        // URLからハッシュを取得し、セッションを確立
        const handleAuthCallback = async () => {
            try {
                const { error } = await supabase.auth.getSession();
                if (error) throw error;

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