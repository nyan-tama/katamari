import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';

// Supabaseクライアントの初期化
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

export async function GET(request: NextRequest) {
    try {
        // URLから記事IDを取得
        const articleId = request.nextUrl.searchParams.get('articleId');

        if (!articleId) {
            return NextResponse.json({ error: '記事IDが指定されていません' }, { status: 400 });
        }

        // 記事情報を取得して公開状態を確認
        console.log('リクエスト記事ID:', articleId);
        const articleResult = await supabase
            .from('articles')
            .select('*')
            .eq('id', articleId)
            .single();

        console.log('記事クエリ結果:', articleResult);
        console.log('記事データ詳細:', JSON.stringify(articleResult.data, null, 2));

        if (articleResult.error || !articleResult.data) {
            console.error('記事情報の取得に失敗しました:', articleResult.error);
            return NextResponse.json({ error: '記事が見つかりません' }, { status: 404 });
        }

        if (articleResult.data.status !== 'published') {
            console.log('記事の状態:', articleResult.data.status);
            return NextResponse.json({ error: 'この記事はまだ公開されていません' }, { status: 403 });
        }

        // 記事に関連するファイル情報を取得
        const { data: files, error: filesError } = await supabase
            .from('download_files')
            .select('*')
            .eq('article_id', articleId);

        if (filesError) {
            console.error('ファイル情報の取得に失敗しました:', filesError);
            return NextResponse.json({ error: 'ファイル情報の取得に失敗しました' }, { status: 500 });
        }

        if (!files || files.length === 0) {
            return NextResponse.json({ error: 'ダウンロード可能なファイルがありません' }, { status: 404 });
        }

        // ファイル情報のデバッグ出力
        console.log('取得したファイル一覧:', JSON.stringify(files, null, 2));

        // JSZipを使用してZIPファイルを作成
        const zip = new JSZip();

        // 各ファイルをダウンロードしてZIPに追加
        for (const file of files) {
            // ファイルのパス情報を確認（カラム名の違いに対応）
            const storagePath = file.storage_path || file.file_path || file.path || `${articleId}/${file.original_name || file.filename}`;
            const fileName = file.original_name || file.filename || 'unknown_file';
            const storageBucket = file.storage_bucket || 'downloads';

            console.log(`ファイル処理中: ${fileName}`);
            console.log(`- パス情報: ${storagePath}`);
            console.log(`- バケット: ${storageBucket}`);

            try {
                const { data: fileData, error: downloadError } = await supabase
                    .storage
                    .from(storageBucket)
                    .download(storagePath);

                if (downloadError || !fileData) {
                    console.error(`${fileName}のダウンロードに失敗しました:`, downloadError);
                    continue; // エラーのファイルはスキップして続行
                }

                console.log(`${fileName}のダウンロード成功: サイズ=${fileData.size} バイト`);

                // Blobデータを明示的にArrayBufferに変換
                const arrayBuffer = await fileData.arrayBuffer();
                console.log(`${fileName}をArrayBufferに変換: サイズ=${arrayBuffer.byteLength} バイト`);

                // ファイルをZIPに追加（ArrayBufferを使用）
                zip.file(fileName, arrayBuffer);
            } catch (fileError) {
                console.error(`${fileName}の処理中にエラーが発生:`, fileError);
                continue; // エラーのファイルはスキップして続行
            }
        }

        // ZIPファイルを生成
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipBuffer = await zipBlob.arrayBuffer();

        // ファイルをレスポンスとして返す
        const response = new NextResponse(zipBuffer);
        response.headers.set('Content-Disposition', `attachment; filename="download-${articleId}.zip"`);
        response.headers.set('Content-Type', 'application/zip');

        return response;
    } catch (error) {
        console.error('ダウンロード処理中にエラーが発生しました:', error);
        return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
    }
} 