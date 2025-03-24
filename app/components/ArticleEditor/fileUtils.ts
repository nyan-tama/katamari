/**
 * 記事エディタのファイル処理関連のユーティリティ
 */

import { createClientSupabase } from '@/lib/supabase-client';

/**
 * 記事用のファイルをアップロードする関数
 */
export const uploadFiles = async (articleId: string, files: File[], replaceExisting: boolean = false, existingFiles: any[] = []) => {
    try {
        const supabase = createClientSupabase();

        // 既存ファイルをすべて削除する場合
        if (replaceExisting && existingFiles.length > 0) {
            console.log('既存のファイルをすべて削除します', existingFiles.length);

            // すべての既存ファイルのIDを取得
            const allFileIds = existingFiles.map(file => file.id);
            
            // 既存ファイルをすべて削除
            const { error: deleteError } = await supabase
                .from('download_files')
                .delete()
                .in('id', allFileIds);

            if (deleteError) {
                console.error('既存ファイルの削除エラー:', deleteError);
            } else {
                console.log(`${allFileIds.length}件のファイルを削除しました`);
            }
            
            // ストレージの対象ファイルも削除
            for (const file of existingFiles) {
                if (file.storage_path) {
                    const { error: storageError } = await supabase.storage
                        .from(file.storage_bucket || 'downloads')
                        .remove([file.storage_path]);
                        
                    if (storageError) {
                        console.error(`ストレージファイル「${file.storage_path}」の削除エラー:`, storageError);
                    }
                }
            }
        }

        // アップロード対象のファイルがなければ終了
        if (files.length === 0) {
            console.log('アップロードするファイルはありません');
            return [];
        }

        // 新規ファイルをアップロード
        console.log(`新規ファイル ${files.length}個をアップロードします`);
        
        // ファイルごとの並列アップロード処理
        const uploadPromises = files.map(async (file) => {
            try {
                // 相対パスを取得（webkitRelativePathがある場合）
                const originalPath = (file as any).webkitRelativePath || '';
                
                // フォルダパスを構築（ファイル名を除く）
                let folderPath = '';
                if (originalPath && originalPath.includes('/')) {
                    // 最後のスラッシュまでをフォルダパスとして抽出
                    folderPath = originalPath.substring(0, originalPath.lastIndexOf('/'));
                }

                console.log(`ファイルアップロード: 元のパス=${originalPath}, 保存先フォルダ=${folderPath}`);

                // 安全なストレージパスの生成（タイムスタンプ + ファイル名）
                const timestamp = Date.now();
                const safeFileName = encodeURIComponent(file.name);
                const storagePath = `${articleId}/${timestamp}_${safeFileName}`;

                console.log(`最終ストレージパス: ${storagePath}`);

                // ストレージにアップロード
                const { data: storageData, error: storageError } = await supabase.storage
                    .from('downloads')
                    .upload(storagePath, file, {
                        cacheControl: '3600',
                        upsert: true
                    });

                if (storageError) {
                    console.error(`ファイル「${originalPath}」のアップロードに失敗:`, storageError);
                    return null;
                }

                // アップロードがうまくいった場合、データベースに情報を保存
                const { data: fileData, error: dbError } = await supabase
                    .from('download_files')
                    .insert({
                        article_id: articleId,
                        storage_bucket: 'downloads',
                        storage_path: storagePath,
                        original_name: file.name,
                        path: `${folderPath}/`,  // 末尾にスラッシュを追加
                        file_size: file.size,
                        file_type: file.type,
                        mime_type: file.type || ''
                    })
                    .select();

                if (dbError) {
                    console.error(`ファイル「${originalPath}」のDB登録に失敗:`, dbError);
                    return null;
                }

                console.log(`ファイル「${file.name}」のアップロードが完了しました`);
                return fileData?.[0];
            } catch (err) {
                console.error(`ファイル「${file.name}」の処理中にエラー:`, err);
                return null;
            }
        });

        // すべてのアップロード処理を待機
        const results = await Promise.all(uploadPromises);
        
        // 正常に処理できたファイルのみフィルタリング
        const successfulUploads = results.filter(Boolean);
        console.log(`${successfulUploads.length}/${files.length}件のファイルアップロードに成功しました`);
        
        return successfulUploads;
    } catch (err) {
        console.error('ファイルアップロード処理全体でのエラー:', err);
        throw err;
    }
};

/**
 * システムファイルやフォルダをフィルタリングする関数
 */
export const filterSystemFiles = (files: File[]) => {
    // システムフォルダのチェック（サブフォルダも含む）
    const systemFolders = ['.git', 'node_modules', '.svn', '.hg', '.vscode'];
    // システムファイルのリスト
    const systemFiles = ['.gitignore', 'HEAD', '.env', '.DS_Store', 'Thumbs.db', 'COMMIT_EDITMSG'];

    const systemFolderFiles: File[] = [];
    let detectedSystemFolder = '';

    // 問題のないファイルとシステムフォルダを含むファイルを分離
    const safeFiles = files.filter(file => {
        // ファイル名だけでシステムファイルをチェック
        const fileName = file.name.toLowerCase();
        if (systemFiles.includes(fileName)) {
            console.log(`システムファイル検出: ${fileName}`);
            return false; // システムファイルはフィルタリング
        }

        const relativePath = (file as any).webkitRelativePath || '';
        if (relativePath && relativePath.includes('/')) {
            const pathParts = relativePath.split('/');
            for (const part of pathParts) {
                if (systemFolders.includes(part)) {
                    // システムフォルダを検出した場合
                    if (!detectedSystemFolder) {
                        detectedSystemFolder = part;
                    }
                    systemFolderFiles.push(file);
                    return false; // このファイルはフィルタリング
                }
            }
        }
        return true; // 問題ないファイルは保持
    });

    return {
        safeFiles,
        systemFolderFiles,
        detectedSystemFolder
    };
};

/**
 * ヒーロー画像をアップロードする関数
 */
export const uploadHeroImage = async (articleId: string, heroImage: File) => {
    try {
        const supabase = createClientSupabase();
        const timestamp = Date.now();
        const fileName = heroImage.name.replace(/\s+/g, '-').toLowerCase();
        const fileExt = fileName.split('.').pop();
        const filePath = `${articleId}/${timestamp}_hero.${fileExt}`;

        // ストレージにアップロード
        const { error: uploadError } = await supabase.storage
            .from('articles')
            .upload(filePath, heroImage, {
                cacheControl: '3600',
                upsert: true
            });

        if (uploadError) {
            throw new Error(`画像アップロードエラー: ${uploadError.message}`);
        }

        // メディア情報をDBに保存
        const { data: mediaData, error: mediaError } = await supabase
            .from('article_media')
            .insert({
                article_id: articleId,
                file_name: fileName,
                storage_path: filePath,
                file_size: heroImage.size,
                file_type: heroImage.type,
                storage_bucket: 'articles',
                media_type: 'hero',
                width: 0,
                height: 0
            })
            .select();

        if (mediaError) {
            throw new Error(`メディア情報保存エラー: ${mediaError.message}`);
        }

        if (mediaData && mediaData.length > 0) {
            return mediaData[0].id;
        }
        
        return null;
    } catch (err) {
        console.error('ヒーロー画像アップロードエラー:', err);
        throw err;
    }
}; 