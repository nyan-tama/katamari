'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientSupabase } from '@/lib/supabase-client';

export default function AuthCallbackPage() {
    const router = useRouter();

    useEffect(() => {
        const handleAuthCallback = async () => {
            try {
                console.log('認証コールバック処理開始');
                const supabase = createClientSupabase();
                
                // URLからハッシュパラメータを取得（Implicitフロー）
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const accessToken = hashParams.get('access_token');
                
                console.log('アクセストークン取得状態:', accessToken ? 'あり' : 'なし');
                
                // URLからクエリパラメータを取得（Authorizationコードフロー）
                const { searchParams } = new URL(window.location.href);
                const code = searchParams.get('code');
                
                console.log('認証コード取得状態:', code ? 'あり' : 'なし');
                
                // Implicitフロー（ハッシュパラメータ）を優先
                if (accessToken) {
                    console.log('Implicitフローでの認証処理');
                    // accessTokenを使ってユーザー情報を取得
                    const { data, error } = await supabase.auth.getUser(accessToken);
                    
                    if (error) {
                        console.error('ユーザー情報取得エラー:', error);
                        throw error;
                    }
                    
                    console.log('認証されたユーザー情報:', data.user);
                } 
                // Authorization Code フロー（code を使用）
                else if (code) {
                    console.log('Authorization Codeフローでの認証処理');
                    // codeをセッションと交換
                    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
                    
                    if (error) {
                        console.error('セッション交換エラー:', error);
                        throw error;
                    }
                    
                    console.log('認証されたユーザー情報:', data.user);
                } else {
                    throw new Error('認証情報が見つかりません（アクセストークンも認証コードもありません）');
                }

                // ログイン成功時にホームにリダイレクト
                console.log('認証成功、ホームページへリダイレクト');
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