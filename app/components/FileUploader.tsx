'use client';

import { useCallback, useState } from 'react';
import { createClientSupabase } from '@/lib/supabase-client';
import CustomFileSelector from './CustomFileSelector';

interface FileUploaderProps {
    articleId: string;
    onFilesUploaded: (files: any[]) => void;
}

export default function FileUploader({ articleId, onFilesUploaded }: FileUploaderProps) {
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [errorType, setErrorType] = useState<'error' | 'warning'>('error');
    const [uploadSuccess, setUploadSuccess] = useState(false);

    // ファイル名バリデーション関数
    const validateFileName = (fileName: string): { valid: boolean; reason?: string } => {
        // 禁止文字のチェック
        const forbiddenChars = ['/', '\\', ':', '*', '?', '"', "'", '<', '>', '|', ';'];
        const hasForbiddenChar = forbiddenChars.some(char => fileName.includes(char));
        if (hasForbiddenChar) {
            return {
                valid: false,
                reason: `ファイル名に次の文字を含めることはできません: ${forbiddenChars.join(' ')}`
            };
        }

        // Windows予約語のチェック（ベース名のみ）
        const fileNameBase = fileName.split('.')[0].toUpperCase();
        const windowsReserved = ['CON', 'PRN', 'AUX', 'NUL',
            'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
            'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
        const isWindowsReserved = windowsReserved.includes(fileNameBase);
        if (isWindowsReserved) {
            return {
                valid: false,
                reason: `"${fileNameBase}" はWindowsの予約語で使用できません`
            };
        }

        // システム関連ファイルチェック
        const systemFiles = ['.gitignore', 'HEAD', '.env', '.DS_Store', 'Thumbs.db', 'COMMIT_EDITMSG'];
        const isSystemFile = systemFiles.some(name => fileName.toLowerCase() === name);
        if (isSystemFile) {
            return {
                valid: false,
                reason: `"${fileName}" はシステム関連ファイルのため使用できません`
            };
        }

        // 機密情報ファイルのパターンチェック
        const sensitivePatterns = /^\.env(\.|$)|secrets\./i;
        const isSensitiveFile = sensitivePatterns.test(fileName);
        if (isSensitiveFile) {
            return {
                valid: false,
                reason: `"${fileName}" は機密情報を含む可能性があるため使用できません`
            };
        }

        // 長さのチェック
        const isTooLong = fileName.length > 250;
        if (isTooLong) {
            return {
                valid: false,
                reason: 'ファイル名が長すぎます（250文字以下にしてください）'
            };
        }

        // 先頭や末尾のスペース/ドットチェック
        const hasLeadingOrTrailingSpace = fileName.startsWith(' ') || fileName.endsWith(' ');
        if (hasLeadingOrTrailingSpace) {
            return {
                valid: false,
                reason: 'ファイル名の先頭または末尾にスペースを含めることはできません'
            };
        }

        // 拡張子の偽装チェック（例：.jpg.exeのような形式）
        const suspiciousExtensions = /\.(jpg|png|gif|jpeg|pdf|doc|docx)\.(exe|bat|sh|cmd|vbs|js)$/i;
        const hasSuspiciousExtension = suspiciousExtensions.test(fileName);
        if (hasSuspiciousExtension) {
            return {
                valid: false,
                reason: '不審な拡張子の組み合わせです。セキュリティ上の理由でアップロードできません'
            };
        }

        return { valid: true };
    };

    // ファイル選択ハンドラ
    const handleFilesSelected = useCallback((selectedFiles: File[]) => {
        // システムフォルダのチェック（サブフォルダも含む）
        const systemFolders = ['.git', 'node_modules', '.svn', '.hg', '.vscode'];
        // システムファイルのリスト
        const systemFiles = ['.gitignore', 'HEAD', '.env', '.ds_store', '.DS_Store', 'Thumbs.db', 'COMMIT_EDITMSG'];

        const systemFolderFiles: File[] = [];
        let detectedSystemFolder = '';
        let detectedSystemFiles: string[] = [];

        console.log('選択されたファイル数:', selectedFiles.length);

        // 問題のないファイルとシステムフォルダを含むファイルを分離
        const safeFiles = selectedFiles.filter(file => {
            // ファイル名だけでシステムファイルをチェック
            const fileName = file.name.toLowerCase().trim();

            // システムファイルチェック
            for (const sysFile of systemFiles) {
                if (fileName === sysFile.toLowerCase()) {
                    console.log(`システムファイル検出: ${file.name} (一致: ${sysFile})`);
                    detectedSystemFiles.push(file.name);
                    return false; // システムファイルはフィルタリング
                }
            }

            // @ts-expect-error: webkitRelativePathはstandard DOMプロパティではない
            const relativePath = file.webkitRelativePath || '';
            if (relativePath && relativePath.includes('/')) {
                const pathParts = relativePath.split('/');
                // フォルダパスの各部分をチェック
                for (const part of pathParts) {
                    const partLower = part.toLowerCase().trim();
                    if (systemFolders.includes(partLower)) {
                        if (!detectedSystemFolder) {
                            detectedSystemFolder = part;
                        }
                        systemFolderFiles.push(file);
                        return false;
                    }
                    // パス内の.DS_Storeファイルもチェック
                    for (const sysFile of systemFiles) {
                        if (partLower === sysFile.toLowerCase()) {
                            console.log(`パス内のシステムファイル検出: ${part} in ${relativePath}`);
                            detectedSystemFiles.push(part);
                            return false;
                        }
                    }
                }
            }
            return true; // 問題ないファイルは保持
        });

        // エラーメッセージの設定
        if (detectedSystemFolder && systemFolderFiles.length > 0) {
            // システムフォルダが検出された場合
            setError(`"${detectedSystemFolder}" を含むパスのファイル(${systemFolderFiles.length}件)はシステム関連フォルダのためアップロードできませんので除外しました`);
            setErrorType('warning'); // 警告タイプに変更
        } else if (detectedSystemFiles.length > 0) {
            // システムファイルが検出された場合
            setError(`システムファイル "${detectedSystemFiles.join('", "')}" が検出されたため除外しました`);
            setErrorType('warning'); // 警告タイプ
        }

        // ファイル名のバリデーション
        const invalidFiles: { name: string, reason: string }[] = [];
        const validFiles = safeFiles.filter(file => {
            const validation = validateFileName(file.name);
            if (!validation.valid && validation.reason) {
                invalidFiles.push({ name: file.name, reason: validation.reason });
                return false;
            }
            return true;
        });

        // 無効なファイルがある場合はエラーを表示
        if (invalidFiles.length > 0) {
            const errorMessages = invalidFiles.map(f => `・${f.name}: ${f.reason}`).join('\n');
            setError(`以下のファイルはアップロードできません:\n${errorMessages}`);
            setErrorType('error'); // エラータイプ
        } else if (systemFolderFiles.length === 0 && detectedSystemFiles.length === 0 && safeFiles.length === validFiles.length) {
            // エラーがまったくない場合のみエラーをクリア
            setError(null);
        }

        // 処理結果のログ
        console.log('ファイル処理結果:', {
            元のファイル数: selectedFiles.length,
            フィルター後のファイル数: safeFiles.length,
            有効なファイル数: validFiles.length,
            システムファイル: detectedSystemFiles,
            システムフォルダ: detectedSystemFolder
        });

        // 処理後のファイルが空の場合
        if (validFiles.length === 0) {
            onFilesUploaded([]);
            return;
        }

        setFiles(validFiles);
        onFilesUploaded(validFiles);
    }, [onFilesUploaded]);

    // ファイルアップロード処理
    const uploadFiles = async () => {
        if (files.length === 0) {
            setError('ファイルが選択されていません');
            return;
        }

        // アップロード前にもう一度サブフォルダを含むシステムフォルダチェック
        const systemFolders = ['.git', 'node_modules', '.svn', '.hg', '.vscode'];
        // システムファイルのリスト
        const systemFiles = ['.gitignore', 'HEAD', '.env', '.ds_store', '.DS_Store', 'Thumbs.db', 'COMMIT_EDITMSG'];

        const systemFolderFiles: File[] = [];
        let detectedSystemFolder = '';
        let detectedSystemFiles: string[] = [];

        console.log('アップロード前のファイル数:', files.length);

        // 問題のないファイルとシステムフォルダを含むファイルを分離
        const safeFiles = files.filter(file => {
            // ファイル名だけでシステムファイルをチェック
            const fileName = file.name.toLowerCase().trim();

            // システムファイルチェック
            for (const sysFile of systemFiles) {
                if (fileName === sysFile.toLowerCase()) {
                    console.log(`システムファイル検出: ${file.name} (一致: ${sysFile})`);
                    detectedSystemFiles.push(file.name);
                    return false; // システムファイルはフィルタリング
                }
            }

            // @ts-expect-error: webkitRelativePathはstandard DOMプロパティではない
            const relativePath = file.webkitRelativePath || '';
            if (relativePath && relativePath.includes('/')) {
                const pathParts = relativePath.split('/');
                for (const part of pathParts) {
                    const partLower = part.toLowerCase().trim();
                    if (systemFolders.includes(partLower)) {
                        // システムフォルダを検出した場合
                        if (!detectedSystemFolder) {
                            detectedSystemFolder = part;
                        }
                        systemFolderFiles.push(file);
                        return false; // このファイルはフィルタリング
                    }
                    // パス内の.DS_Storeファイルもチェック
                    for (const sysFile of systemFiles) {
                        if (partLower === sysFile.toLowerCase()) {
                            console.log(`パス内のシステムファイル検出: ${part} in ${relativePath}`);
                            detectedSystemFiles.push(part);
                            return false;
                        }
                    }
                }
            }
            return true; // 問題ないファイルは保持
        });

        // エラーメッセージの設定
        if (detectedSystemFolder && systemFolderFiles.length > 0) {
            // システムフォルダが検出された場合
            setError(`"${detectedSystemFolder}" を含むパスのファイル(${systemFolderFiles.length}件)はシステム関連フォルダのためアップロードできませんので除外しました`);
            setErrorType('warning'); // 警告タイプに変更
        } else if (detectedSystemFiles.length > 0) {
            // システムファイルが検出された場合
            setError(`システムファイル "${detectedSystemFiles.join('", "')}" が検出されたため除外しました`);
            setErrorType('warning'); // 警告タイプ
        }

        // 処理結果のログ
        console.log('アップロード前のファイル処理結果:', {
            元のファイル数: files.length,
            フィルター後のファイル数: safeFiles.length,
            システムファイル: detectedSystemFiles,
            システムフォルダ: detectedSystemFolder
        });

        // 安全なファイルがない場合は終了
        if (safeFiles.length === 0) {
            setError('アップロードできるファイルがありません');
            setErrorType('error');
            return;
        }

        setUploading(true);
        if (systemFolderFiles.length === 0 && detectedSystemFiles.length === 0) {
            // エラーがまったくない場合のみエラーをクリア
            setError(null);
        }
        setUploadSuccess(false);

        try {
            const supabase = createClientSupabase();
            const uploadedFiles = [];

            // UUIDの処理を修正：1つ目のパート（8桁）と2つ目のパート（最初の4桁）を使用
            const uuidParts = articleId.split('-');
            const firstPart = uuidParts[0];           // 例: 39dab4d8
            const secondPart = uuidParts[1].substring(0, 4); // 例: f600 (f600から4文字)
            const parentFolderName = `3D-PRINTER-DOWNLOAD-DATA-${firstPart}-${secondPart}`;
            console.log('親フォルダ名:', parentFolderName);

            // フォルダアップロードかどうかを判定
            // @ts-expect-error: webkitRelativePathはstandard DOMプロパティではない
            const hasFolder = safeFiles.some(file =>
                file.webkitRelativePath && file.webkitRelativePath.includes('/')
            );
            let originalFolderName = '';

            if (hasFolder) {
                // フォルダアップロードの場合、最初のファイルのパスから元のフォルダ名を抽出（サブフォルダとして使用）
                // @ts-expect-error: webkitRelativePathはstandard DOMプロパティではない
                const firstPath = safeFiles[0].webkitRelativePath || '';
                originalFolderName = firstPath.split('/')[0];
                console.log('フォルダアップロード検出:', {
                    firstPath,
                    extractedFolderName: originalFolderName,
                    fileCount: safeFiles.length
                });
            }

            // 各ファイルを処理
            for (const file of safeFiles) {
                try {
                    // 元のパス情報を取得
                    let originalPath = '';
                    let folderPath = '';

                    // @ts-expect-error: webkitRelativePathはstandard DOMプロパティではない
                    if (hasFolder && file.webkitRelativePath) {
                        // @ts-expect-error: webkitRelativePathはstandard DOMプロパティではない
                        originalPath = file.webkitRelativePath;

                        // 元のパスを親フォルダ名＋元のパスに変換
                        // 例: abc/file.txt → 3D-PRINTER-DOWNLOAD-DATA-xxx/abc/file.txt
                        const pathParts = originalPath.split('/');

                        // ファイル名を除いたパスを作成
                        if (pathParts.length > 1) {
                            // パスの最初の部分を親フォルダ名に置き換え
                            folderPath = `${parentFolderName}/${originalPath.substring(0, originalPath.lastIndexOf('/'))}`;
                        } else {
                            // 単一階層の場合は親フォルダ直下
                            folderPath = `${parentFolderName}`;
                        }
                    } else {
                        // 単一ファイルの場合は親フォルダ直下
                        originalPath = file.name;
                        folderPath = `${parentFolderName}`;
                    }

                    // パスの長さをチェックして必要なら切り詰める（DBの制限を考慮）
                    const MAX_PATH_LENGTH = 250; // データベースのパスカラム最大長
                    if (folderPath.length > MAX_PATH_LENGTH) {
                        console.warn(`パスが長すぎます: ${folderPath.length}文字 > ${MAX_PATH_LENGTH}文字`);
                        console.warn(`元のパス: ${folderPath}`);

                        // パスが長すぎる場合はエラーを設定してスキップ
                        setError(`ファイル「${file.name}」のパスが長すぎます（${folderPath.length}文字）。もっと浅い階層でフォルダを作成してください。`);
                        setErrorType('error');
                        continue; // このファイルはスキップして次へ
                    }

                    console.log('ファイル情報:', {
                        name: file.name,
                        originalPath,
                        folderPath
                    });

                    // 安全なストレージパスの生成（タイムスタンプ + ファイル名）
                    const timestamp = Date.now();
                    const safeFileName = encodeURIComponent(file.name);
                    const storagePath = `${articleId}/${timestamp}_${safeFileName}`;

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
                            path: `${folderPath}/`,             // ファイル名を含まないパス、末尾にスラッシュを追加
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
                setUploadSuccess(true);
                onFilesUploaded(uploadedFiles);
                setFiles([]); // ファイルリストをクリア
                console.log('アップロード完了:', {
                    成功件数: uploadedFiles.length,
                    総ファイル数: files.length
                });
            } else {
                setError('ファイルのアップロードに失敗しました。再試行してください。');
            }
        } catch (err) {
            console.error('ファイルアップロードエラー:', err);
            setError('ファイルアップロード中にエラーが発生しました');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-4 bg-gray-50 border-b">
                    <h3 className="text-lg font-medium text-gray-900">ダウンロードファイルのアップロード</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        記事と一緒にダウンロードできるファイルをアップロードします。
                    </p>
                </div>

                <div className="p-4">
                    <CustomFileSelector onFilesSelected={handleFilesSelected} />

                    {error && (
                        <div className={`mt-4 ${errorType === 'error'
                            ? 'bg-red-50 border-2 border-red-400 text-red-700'
                            : 'bg-yellow-50 border-2 border-yellow-400 text-yellow-700'} px-4 py-3 rounded`}>
                            <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <span className="font-medium">{errorType === 'error' ? 'エラー' : '注意'}</span>
                            </div>
                            <div className="mt-1 whitespace-pre-line">{error}</div>
                        </div>
                    )}

                    {uploadSuccess && (
                        <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                            ファイルのアップロードが完了しました！
                        </div>
                    )}

                    {files.length > 0 && (
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={uploadFiles}
                                disabled={uploading}
                                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md flex items-center gap-2 disabled:opacity-50"
                            >
                                {uploading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        アップロード中...
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
                                        </svg>
                                        ファイルをアップロード
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 