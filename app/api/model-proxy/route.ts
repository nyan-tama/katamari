// app/api/model-proxy/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Supabaseクライアントの初期化
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

export async function GET(request: NextRequest) {
    try {
        // URLからパラメータを取得
        const articleId = request.nextUrl.searchParams.get('articleId');
        const path = request.nextUrl.searchParams.get('path');

        if (!articleId || !path) {
            return new NextResponse('必要なパラメータが不足しています', { status: 400 });
        }

        // ファイルをダウンロード
        const { data: fileData, error: downloadError } = await supabase.storage
            .from('downloads')
            .download(path);

        if (downloadError || !fileData) {
            console.error('ファイルのダウンロードに失敗:', downloadError);
            return new NextResponse('ファイルのダウンロードに失敗しました', { status: 500 });
        }

        // ファイル拡張子を取得
        const fileExtension = path.split('.').pop()?.toLowerCase();

        // Content-Typeを設定
        let contentType = 'application/octet-stream';
        if (fileExtension === 'obj') contentType = 'text/plain';
        if (fileExtension === 'stl') contentType = 'application/octet-stream';

        // ファイルを直接返す
        const response = new NextResponse(fileData);
        response.headers.set('Content-Type', contentType);
        response.headers.set('Cache-Control', 'no-store');

        return response;
    } catch (error) {
        console.error('プロキシ処理中にエラーが発生しました:', error);
        return new NextResponse('サーバーエラーが発生しました', { status: 500 });
    }
}