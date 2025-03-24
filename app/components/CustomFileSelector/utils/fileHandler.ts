import { ExtendedFile } from '../types';
import { validateFileName, SYSTEM_FOLDERS, SYSTEM_FILES, MAX_PATH_LENGTH } from './fileUtils';

/**
 * ファイルをフィルタリングして問題のあるファイルを検出する
 */
export const filterFiles = (files: File[]) => {
  const systemFolderFiles: File[] = [];
  let detectedSystemFolder = '';
  let detectedSystemFiles: string[] = [];
  let hasLongPathWarning = false;

  // 問題のないファイルをフィルタリング
  const filteredFiles = files.filter(file => {
    // ファイル名だけでシステムファイルをチェック
    const fileName = file.name.toLowerCase().trim();

    // システムファイルチェック
    for (const sysFile of SYSTEM_FILES) {
      if (fileName === sysFile.toLowerCase()) {
        console.log(`システムファイル検出: ${file.name} (一致: ${sysFile})`);
        detectedSystemFiles.push(file.name);
        return false; // システムファイルはフィルタリング
      }
    }

    const relativePath = (file as any).webkitRelativePath || '';
    if (relativePath && relativePath.includes('/')) {
      console.log(`パスチェック: ${relativePath}`);
      const pathParts = relativePath.split('/');
      // フォルダパスの各部分をチェック
      for (const part of pathParts) {
        const partLower = part.toLowerCase().trim();
        if (SYSTEM_FOLDERS.includes(partLower)) {
          if (!detectedSystemFolder) {
            detectedSystemFolder = part;
          }
          systemFolderFiles.push(file);
          return false;
        }
        // パス内の.DS_Storeファイルもチェック
        for (const sysFile of SYSTEM_FILES) {
          if (partLower === sysFile.toLowerCase()) {
            console.log(`パス内のシステムファイル検出: ${part} in ${relativePath}`);
            detectedSystemFiles.push(part);
            return false;
          }
        }
      }
    }

    // パスの長さをチェック
    if (relativePath && relativePath.length > MAX_PATH_LENGTH) {
      console.log(`長すぎるパスを検出: ${relativePath.substring(0, 50)}... (${relativePath.length}文字)`);
      hasLongPathWarning = true;
    }

    return true; // 問題ないファイルは保持
  });

  // ファイル名のバリデーション
  const invalidFiles: { name: string, reason: string }[] = [];
  const validFiles = filteredFiles.filter(file => {
    const validation = validateFileName(file.name);
    if (!validation.valid && validation.reason) {
      invalidFiles.push({ name: file.name, reason: validation.reason });
      return false;
    }
    return true;
  });

  return {
    validFiles,
    invalidFiles,
    detectedSystemFolder,
    systemFolderFiles,
    detectedSystemFiles,
    hasLongPathWarning,
  };
};

/**
 * ExtendedFileオブジェクトに変換する
 */
export const createExtendedFiles = (files: File[]): ExtendedFile[] => {
  return files.map(file => {
    // パス情報を取得
    const relativePath = (file as any).webkitRelativePath || '';

    return {
      originalFile: file,
      relativePath: relativePath || '',
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      name: file.name,
      size: file.size,
      type: file.type
    };
  });
};

/**
 * initialFilesからExtendedFileへの変換
 */
export const convertInitialFiles = (initialFiles: any[]): ExtendedFile[] => {
  return initialFiles.map(file => {
    // ダミーのFileオブジェクトを作成
    const dummyFile = new File(
      [new Blob([''], { type: file.file_type || 'application/octet-stream' })],
      file.original_name,
      { type: file.file_type || 'application/octet-stream' }
    );

    // パスはそのまま保持（変換しない）
    const relativePath = file.path;

    return {
      originalFile: dummyFile,
      relativePath,
      name: file.original_name,
      size: file.file_size,
      type: file.file_type || '',
      id: file.id,            // 既存ファイル識別用
      storagePath: file.storage_path, // 既存ファイル削除用
      isExisting: true        // 既存ファイルフラグ
    } as ExtendedFile;
  });
}; 