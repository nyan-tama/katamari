/**
 * ファイルダウンロードに関するサービス
 */
import { createClientSupabase } from '@/lib/supabase-client';
import { FileData } from '../types';
import { createSafePath, createAlternativePath } from '../utils/pathUtils';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { generateZipFileName } from '../utils/fileUtils';

/**
 * 単一ファイルをダウンロードする
 */
export const downloadSingleFile = async (file: FileData, articleId: string): Promise<void> => {
    console.log(`ファイル「${file.original_name}」のダウンロード開始:`, {
        storagePath: file.storage_path,
        bucket: file.storage_bucket
    });

    const supabase = createClientSupabase();

    // 安全なパスを生成
    const encodedPath = createSafePath(file.storage_path);

    console.log('ダウンロードパス:', {
        original: file.storage_path,
        encoded: encodedPath
    });

    // 代替パスを生成
    const alternativePath = createAlternativePath(file.storage_path, articleId);

    try {
        // 通常のパスで試みる
        const { data, error } = await supabase.storage
            .from(file.storage_bucket)
            .download(encodedPath);

        if (error) {
            console.error('通常パスでのダウンロードエラー:', error);

            // 代替パスがあれば試す
            if (alternativePath) {
                console.log('代替パスでダウンロード試行:', alternativePath);
                const { data: altData, error: altError } = await supabase.storage
                    .from(file.storage_bucket)
                    .download(alternativePath);

                if (altError) {
                    console.error('代替パスでもダウンロードエラー:', altError);
                    throw new Error(`${file.original_name}のダウンロードに失敗しました`);
                }

                if (!altData) {
                    throw new Error(`${file.original_name}のダウンロードに失敗しました: データが取得できません`);
                }

                // 代替パスでダウンロード成功
                console.log(`代替パスでファイル「${file.original_name}」のダウンロード成功`);
                
                downloadBlobAsFile(altData, file.original_name);
                return;
            }

            throw error;
        }

        if (!data) {
            throw new Error(`${file.original_name}のダウンロードに失敗しました: データが取得できません`);
        }

        // ファイルダウンロード
        downloadBlobAsFile(data, file.original_name);

        console.log(`ファイル「${file.original_name}」のダウンロード完了`);
    } catch (error) {
        console.error('ダウンロード処理エラー:', error);
        throw error;
    }
};

/**
 * フォルダ内のファイルをZIPにまとめてダウンロードする
 */
export const downloadFolderAsZip = async (
    folderPath: string, 
    files: FileData[], 
    articleId: string
): Promise<void> => {
    console.log(`フォルダ「${folderPath}」のZIPダウンロード開始`);

    // フォルダ内のすべてのファイルを収集
    const folderFiles = files.filter(file =>
        !file.path ? folderPath === '' : (file.path === folderPath || file.path.startsWith(folderPath))
    );

    if (folderFiles.length === 0) {
        throw new Error('フォルダ内にダウンロード可能なファイルがありません');
    }

    console.log(`ダウンロード対象ファイル: ${folderFiles.length}件`,
        folderFiles.map(f => ({ name: f.original_name, path: f.path })));

    const zip = new JSZip();
    const supabase = createClientSupabase();

    // 各ファイルをダウンロードしてZIPに追加
    for (const file of folderFiles) {
        try {
            console.log(`ZIPに追加: ${file.path}${file.original_name}`);

            // 安全なパスを生成
            const encodedPath = createSafePath(file.storage_path);

            // 代替パスを生成
            const alternativePath = createAlternativePath(file.storage_path, articleId);

            let fileData = null;

            // 通常のパスでダウンロード試行
            const { data, error } = await supabase.storage
                .from(file.storage_bucket)
                .download(encodedPath);

            if (error) {
                console.error(`ファイル「${file.original_name}」の取得エラー:`, error);

                // 代替パスがあれば試す
                if (alternativePath) {
                    console.log('代替パスでダウンロード試行:', alternativePath);
                    const { data: altData, error: altError } = await supabase.storage
                        .from(file.storage_bucket)
                        .download(alternativePath);

                    if (altError) {
                        console.error('代替パスでもダウンロードエラー:', altError);
                        continue; // このファイルはスキップ
                    }

                    if (!altData) {
                        console.error(`ファイル「${file.original_name}」のダウンロードにデータがありません`);
                        continue; // このファイルはスキップ
                    }

                    fileData = altData;
                } else {
                    continue; // このファイルはスキップ
                }
            } else {
                fileData = data;
            }

            if (!fileData) {
                continue; // データがない場合はスキップ
            }

            // ファイルをZIPに追加（元のパス構造を維持）
            // フォルダ内の相対パスを計算 (ルートフォルダの場合は考慮)
            let relativePath = '';
            if (file.path) {
                relativePath = folderPath === ''
                    ? `${file.path}${file.original_name}`
                    : `${file.path.substring(folderPath.length)}${file.original_name}`;
            } else {
                relativePath = file.original_name;
            }

            // 先頭の / を削除（ZIPでの相対パス用）
            if (relativePath.startsWith('/')) {
                relativePath = relativePath.substring(1);
            }

            zip.file(relativePath, await fileData.arrayBuffer());
            console.log(`ファイル「${relativePath}」をZIPに追加しました`);
        } catch (fileErr) {
            console.error(`ファイル「${file.original_name}」の処理中にエラー:`, fileErr);
            // エラーがあっても続行
        }
    }

    // ZIPファイルを生成してダウンロード
    const content = await zip.generateAsync({ type: 'blob' });
    const zipFileName = generateZipFileName(articleId, folderPath);

    saveAs(content, zipFileName);

    console.log(`フォルダ「${folderPath}」のZIPダウンロード完了: ${zipFileName}`);
};

/**
 * Blobをファイルとしてダウンロードするヘルパー関数
 */
const downloadBlobAsFile = (blob: Blob, fileName: string): void => {
    const url = URL.createObjectURL(blob);

    // ダウンロードリンクを作成
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();

    // クリーンアップ
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
}; 