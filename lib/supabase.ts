// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 認証が必要なルートのみリストアップ（これらのルートのみセッションリフレッシュを実行）
const protectedRoutes = [
    '/dashboard',
    '/profile',
    '/articles/new',
    '/articles/edit'
];

// リクエスト元のURLをチェックする関数
function shouldRefreshSession(req: NextRequest): boolean {
    // リフレッシュが必要なパスかどうかを確認
    const path = req.nextUrl.pathname;
    
    // 静的アセットや認証関連パスではリフレッシュしない
    if (
        path.startsWith('/_next/') ||
        path.startsWith('/api/auth') ||
        path.startsWith('/auth/') ||
        path.startsWith('/callback') ||
        path.includes('.') || // 静的ファイル
        path === '/' ||      // トップページ
        (path.startsWith('/articles/') && !path.includes('/edit')) // 編集以外の記事ページ
    ) {
        return false;
    }
    
    // 明示的に保護されたルートのみリフレッシュを実行
    return protectedRoutes.some(route => path.startsWith(route));
}

export async function middleware(req: NextRequest) {
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req, res });

    // 必要な場合のみセッションリフレッシュを実行
    if (shouldRefreshSession(req)) {
        await supabase.auth.getSession();
    }

    return res;
}

// 必要に応じてmatcherを設定
export const config = {
    matcher: [
        // 認証が必要なページを指定
        '/dashboard/:path*',
        '/profile/:path*',
        '/articles/new/:path*',
        '/articles/edit/:path*',
        // すべてのページを対象にしない
        // '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};