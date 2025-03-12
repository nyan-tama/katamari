// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// リクエスト元のURLをチェックする関数
function shouldRefreshSession(req: NextRequest): boolean {
    // リフレッシュが不要なパスをスキップ
    const path = req.nextUrl.pathname;

    // 静的アセットや認証関連パスではリフレッシュしない
    if (
        path.startsWith('/_next/') ||
        path.startsWith('/api/auth') ||
        path.startsWith('/auth/') ||
        path.includes('.') // 静的ファイル
    ) {
        return false;
    }

    return true;
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
        // すべてのページを対象にしない
        // '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};