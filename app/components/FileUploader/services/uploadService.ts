/**
 * ファイルアップロード処理のためのサービス
 */
import { createClientSupabase } from '@/lib/supabase-client';
import { UploadResult, UploadedFileData } from '../types';
import { 
    generateParentFolderName,
    generateFolderPath,
    isPathTooLong,
    detectFolderUpload,
    getOriginalFolderName,
    generateStoragePath
} from '../utils/pathUtils';

/**
 * ファイルをアップロードする
 * 選択されたファイルをSupabaseにアップロードし、メタデータをデータベースに保存します
 */
export const uploadFiles = async (files: File[], articleId: string): Promise<UploadResult> => {
    // ファイルが選択されていない場合
    if (files.length === 0) {
        return {
            success: false,
            files: [],
            error: 'ファイルが選択されていません'
        };
    }

    try {
        const supabase = createClientSupabase();
        const uploadedFiles: UploadedFileData[] = [];

        // 親フォルダ名を生成
        const parentFolderName = generateParentFolderName(articleId);
        console.log('親フォルダ名:', parentFolderName);

        // フォルダアップロードかどうかを判定
        const hasFolder = detectFolderUpload(files);
        const originalFolderName = hasFolder ? getOriginalFolderName(files) : '';

        if (hasFolder) {
            console.log('フォルダアップロード検出:', {
                extractedFolderName: originalFolderName,
                fileCount: files.length
            });
        }

        // 各ファイルを処理
        for (const file of files) {
            try {
                // フォルダパスを生成
                const folderPath = generateFolderPath(file, parentFolderName, hasFolder);

                // パスの長さをチェック
                if (isPathTooLong(folderPath)) {
                    console.warn(`パスが長すぎます: ${folderPath.length}文字 > 250文字`);
                    console.warn(`元のパス: ${folderPath}`);
                    continue; // このファイルはスキップして次へ
                }

                console.log('ファイル情報:', {
                    name: file.name,
                    folderPath
                });

                // ストレージパスを生成
                const storagePath = generateStoragePath(articleId, file.name);

                // Supabaseストレージにアップロード
                const { data, error: uploadError } = await supabase.storage
                    .from('downloads')
                    .upload(storagePath, file, {
                        cacheControl: '3600',
                        upsert: true
                    });

                if (uploadError) {
                    console.error(`ファイル「${file.name}」のアップロードに失敗:`, uploadError);
                    continue; // 失敗しても次のファイルを試す
                }

                // download_filesテーブルにメタデータ保存
                const { data: fileData, error: fileError } = await supabase
                    .from('download_files')
                    .insert({
                        article_id: articleId,
                        original_name: file.name,
                        path: `${folderPath}/`,  // ファイル名を含まないパス、末尾にスラッシュを追加
                        storage_path: storagePath,
                        file_size: file.size,
                        file_type: file.type || '',
                        mime_type: file.type || '',
                        storage_bucket: 'downloads'
                    })
                    .select()
                    .single();

                if (fileError) {
                    console.error(`ファイル「${file.name}」のメタデータ保存に失敗:`, fileError);
                } else if (fileData) {
                    uploadedFiles.push(fileData);
                }
            } catch (fileErr) {
                console.error(`ファイル「${file.name}」の処理中にエラー:`, fileErr);
            }
        }

        // 成功時の処理
        if (uploadedFiles.length > 0) {
            console.log('アップロード完了:', {
                成功件数: uploadedFiles.length,
                総ファイル数: files.length
            });
            return {
                success: true,
                files: uploadedFiles
            };
        } else {
            return {
                success: false,
                files: [],
                error: 'ファイルのアップロードに失敗しました。再試行してください。'
            };
        }
    } catch (err) {
        console.error('ファイルアップロードエラー:', err);
        return {
            success: false,
            files: [],
            error: 'ファイルアップロード中にエラーが発生しました'
        };
    }
}; 