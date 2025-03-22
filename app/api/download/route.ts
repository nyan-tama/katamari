import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Supabaseクライアントの初期化
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(request: NextRequest) {
  try {
    // URLからファイルIDを取得
    const fileId = request.nextUrl.searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json({ error: 'ファイルIDが指定されていません' }, { status: 400 });
    }

    // ファイル情報を取得
    const { data: file, error: fileError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fileError || !file) {
      console.error('ファイル情報の取得に失敗しました:', fileError);
      return NextResponse.json({ error: 'ファイルが見つかりません' }, { status: 404 });
    }

    // 記事情報を取得して公開状態を確認
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('status')
      .eq('id', file.article_id)
      .single();

    if (articleError || !article) {
      console.error('記事情報の取得に失敗しました:', articleError);
      return NextResponse.json({ error: '関連する記事が見つかりません' }, { status: 404 });
    }

    if (article.status !== 'published') {
      return NextResponse.json({ error: 'このファイルはまだ公開されていません' }, { status: 403 });
    }

    // ファイルのダウンロードURLを取得
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('files')
      .download(file.file_path);

    if (downloadError || !fileData) {
      console.error('ファイルのダウンロードに失敗しました:', downloadError);
      return NextResponse.json({ error: 'ファイルのダウンロードに失敗しました' }, { status: 500 });
    }

    // ファイルをレスポンスとして返す
    const response = new NextResponse(fileData);
    response.headers.set('Content-Disposition', `attachment; filename="${file.original_name}"`);
    response.headers.set('Content-Type', 'application/octet-stream');

    return response;
  } catch (error) {
    console.error('ダウンロード処理中にエラーが発生しました:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
} 