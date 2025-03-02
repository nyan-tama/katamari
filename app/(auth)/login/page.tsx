'use client';

import { useState } from 'react';
import { createClientSupabase } from '@/lib/supabase-client';
import Link from 'next/link';

export default function LoginPage() {
    const [loading, setLoading] = useState(false);

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            const supabase = createClientSupabase();
            
            // skipBrowserRedirectを使用して認証URLを取得し、手動でリダイレクト
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/callback`,
                    skipBrowserRedirect: true,
                }
            });

            if (error) throw error;
            
            if (data?.url) {
                // 取得したURLに手動でリダイレクト
                window.location.href = data.url;
            } else {
                throw new Error('認証URLが取得できませんでした');
            }
        } catch (error) {
            console.error('Googleログインエラー:', error);
            alert('Googleログインに失敗しました。もう一度お試しください。');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-16">
            <div className="max-w-md mx-auto bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-8">
                    <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">
                        カタワクへようこそ
                    </h2>

                    <div className="space-y-4">
                        <button
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-md px-4 py-3 transition-colors"
                        >
                            <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                                <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                                    <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                                    <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                                    <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                                    <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
                                </g>
                            </svg>
                            {loading ? 'ログイン中...' : 'Googleでログイン'}
                        </button>
                    </div>

                    <div className="mt-8 text-center text-sm text-gray-600">
                        <p>
                            ログインすることで、
                            <Link href="/terms" className="text-pink-500 hover:underline">
                                利用規約
                            </Link>
                            と
                            <Link href="/privacy" className="text-pink-500 hover:underline">
                                プライバシーポリシー
                            </Link>
                            に同意したことになります。
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}