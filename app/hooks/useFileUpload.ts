import { useState } from 'react';
import { createClientSupabase } from '@/lib/supabase-client';

// webkitRelativePath プロパティをサポートするために File 型を拡張
interface ExtendedFile extends File {
  webkitRelativePath?: string;
}

interface UseFileUploadProps {
  setFilesError: (error: string | null) => void;
  setFilesErrorType: (type: 'error' | 'warning') => void;
}

export function useFileUpload({ setFilesError, setFilesErrorType }: UseFileUploadProps) {
  const [uploading, setUploading] = useState(false);

  // ファイルアップロード関数
  const uploadFiles = async (articleId: string, files: File[]) => {
    if (files.length === 0) return [];

    // アップロード中フラグをセット
    setUploading(true);

    try {
      // システムフォルダのチェック（サブフォルダも含む）
      const systemFolders = ['.git', 'node_modules', '.svn', '.hg', '.vscode'];
      // システムファイルのリスト
      const systemFiles = ['.gitignore', 'HEAD', '.env', '.DS_Store', 'Thumbs.db', 'COMMIT_EDITMSG'];

      let systemFolderFiles: File[] = [];
      let detectedSystemFolder = '';

      // 問題のないファイルとシステムフォルダを含むファイルを分離
      const safeFiles = files.filter(file => {
        // ファイル名だけでシステムファイルをチェック
        const fileName = file.name.toLowerCase();
        if (systemFiles.includes(fileName)) {
          console.log(`システムファイル検出: ${fileName}`);
          return false; // システムファイルはフィルタリング
        }

        const extendedFile = file as ExtendedFile;
        const relativePath = extendedFile.webkitRelativePath || '';
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

      // システムフォルダが見つかった場合は警告を表示
      if (systemFolderFiles.length > 0) {
        setFilesError(`"${detectedSystemFolder}" を含むパスのファイル(${systemFolderFiles.length}件)はシステム関連フォルダのためアップロードできませんので除外しました`);
        setFilesErrorType('warning'); // 警告タイプに設定
      }

      // 安全なファイルがない場合は終了
      if (safeFiles.length === 0) {
        setFilesError('アップロードできるファイルがありません');
        setFilesErrorType('error'); // エラータイプに設定
        return [];
      }

      setFilesError(null);

      // UUIDの処理：1つ目のパート（8桁）と2つ目のパート（最初の4桁）を使用
      const uuidParts = articleId.split('-');
      const firstPart = uuidParts[0];           // 例: 39dab4d8
      const secondPart = uuidParts[1].substring(0, 4); // 例: f600 (f600から4文字)
      const parentFolderName = `3D-PRINTER-DOWNLOAD-DATA-${firstPart}-${secondPart}`;
      console.log('親フォルダ名:', parentFolderName);

      const supabase = createClientSupabase();
      const uploadedFiles = [];
      let hasFolder = false;
      let originalFolderName = '';

      // フォルダアップロードのチェック
      hasFolder = (files as ExtendedFile[]).some(file => file.webkitRelativePath);
      console.log('フォルダアップロードの有無:', hasFolder);

      try {
        // フォルダアップロードの場合、最初のファイルのパスから元のフォルダ名を抽出（サブフォルダとして使用）
        if (files.length > 0) {
          const firstFile = files[0] as ExtendedFile;
          originalFolderName = firstFile.webkitRelativePath && firstFile.webkitRelativePath.includes('/') 
            ? firstFile.webkitRelativePath.split('/')[0] 
            : '';
          console.log('フォルダアップロード検出:', {
            originalFolderName,
            fileCount: files.length
          });
        }

        // 各ファイルを処理
        for (const file of files) {
          try {
            // 元のパス情報を取得
            let originalPath = '';
            let folderPath = '';
            const extendedFile = file as ExtendedFile;

            if (hasFolder && extendedFile.webkitRelativePath) {
              originalPath = extendedFile.webkitRelativePath;

              // 元のパスを親フォルダ名＋元のパスに変換
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
              setFilesError(`ファイル「${file.name}」のパスが長すぎます（${folderPath.length}文字）。もっと浅い階層でフォルダを作成してください。`);
              setFilesErrorType('error');
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
                path: `${folderPath}/`, // ファイル名を含まないパス、末尾にスラッシュを追加
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

        console.log('アップロード完了:', uploadedFiles);
        return uploadedFiles;
      } catch (err) {
        console.error('ファイルアップロードエラー:', err);
        setFilesError('ファイルアップロード中にエラーが発生しました');
        return [];
      }
    } catch (err) {
      console.error('ファイルアップロードエラー:', err);
      setFilesError('ファイルアップロード中にエラーが発生しました');
      return [];
    } finally {
      // 処理完了時にアップロード中フラグを解除
      setUploading(false);
    }
  };

  return {
    uploadFiles,
    uploading
  };
} 