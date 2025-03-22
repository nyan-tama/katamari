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

        // ファイルをグループ化（同じフォルダ名のものをまとめる）
        const fileGroups = files.reduce((groups: Record<string, any[]>, file) => {
            const folderName = file.folder_name || 'default';
            if (!groups[folderName]) {
                groups[folderName] = [];
            }
            groups[folderName].push(file);
            return groups;
        }, {});

        console.log('ファイルグループ:', Object.keys(fileGroups));

        // 各ファイルをダウンロードしてZIPに追加
        for (const file of files) {
            // ファイルのパス情報を確認（カラム名の違いに対応）
            const storagePath = file.storage_path || file.file_path || '';
            const fileName = file.original_name || file.file_name || 'unknown_file';
            const storageBucket = file.storage_bucket || 'downloads';

            // ZIPファイル内でのパス構造を決定
            let zipPath = fileName;

            // pathフィールドがある場合、フォルダ構造を保持
            if (file.path && file.path !== fileName) {
                zipPath = file.path;
            }

            console.log(`ファイル処理中: ${fileName}`);
            console.log(`- ストレージパス: ${storagePath}`);
            console.log(`- ZIPパス: ${zipPath}`);
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

                // ファイルをZIPに追加（ArrayBufferを使用）- パス構造を維持
                zip.file(zipPath, arrayBuffer);
            } catch (fileError) {
                console.error(`${fileName}の処理中にエラーが発生:`, fileError);
                continue; // エラーのファイルはスキップして続行
            }
        }

        // ダウンロードカウンターの更新（エラーがあっても処理続行）
        try {
            await supabase
                .from('articles')
                .update({ download_count: supabase.rpc('increment', { field: 'download_count' }) })
                .eq('id', articleId);
            console.log('ダウンロードカウンター更新');
        } catch (countError) {
            console.error('ダウンロードカウンターの更新に失敗:', countError);
        }

        // ZIPファイルを生成
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipBuffer = await zipBlob.arrayBuffer();

        // ファイル名の決定 - 3D-PRINTER-DOWNLOAD-DATA形式を使用
        let zipFileName = `download-${articleId}.zip`;

        // UUIDからフォルダ名を生成（アップロード時と同じ形式）
        const uuidParts = articleId.split('-');
        if (uuidParts.length >= 2) {
            // 1つ目のパート（8桁）と2つ目のパート（最初の4桁）を使用
            const firstPart = uuidParts[0];           // 例: 39dab4d8
            const secondPart = uuidParts[1].substring(0, 4); // 例: f600 (f600から4文字)
            const folderPrefix = `3D-PRINTER-DOWNLOAD-DATA-${firstPart}-${secondPart}`;
            zipFileName = `${folderPrefix}.zip`;
        }

        // 記事タイトルがあれば、それをファイル名に併記
        if (articleResult.data.title) {
            // ファイル名に使えない文字を削除
            const safeTitle = articleResult.data.title.replace(/[\\/:*?"<>|]/g, '_').substring(0, 50);
            zipFileName = `${zipFileName.replace('.zip', '')}_${safeTitle}.zip`;
        }

        // ファイルをレスポンスとして返す
        const response = new NextResponse(zipBuffer);
        response.headers.set('Content-Disposition', `attachment; filename="${zipFileName}"`);
        response.headers.set('Content-Type', 'application/zip');

        return response;
    } catch (error) {
        console.error('ダウンロード処理中にエラーが発生しました:', error);
        return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
    }
} 