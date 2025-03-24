import { FileValidationResult, ExtendedFile, FolderNode } from '../types';

/**
 * ファイルサイズをフォーマットする関数
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * ファイル名のバリデーション関数
 */
export const validateFileName = (fileName: string): FileValidationResult => {
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
  const systemFiles = ['.gitignore', 'HEAD', '.env', '.ds_store', '.DS_Store', 'Thumbs.db', 'COMMIT_EDITMSG'];
  const isSystemFile = systemFiles.some(name => fileName.toLowerCase().trim() === name.toLowerCase());
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

/**
 * フォルダ構造を更新する関数
 */
export const buildFolderStructure = (fileList: ExtendedFile[]): FolderNode => {
  const newStructure: FolderNode = {
    name: 'root',
    path: '',
    files: [],
    subfolders: {}
  };

  // ルートレベルのファイルを保持する配列
  const rootFiles: ExtendedFile[] = [];

  // 各ファイルを処理
  fileList.forEach(file => {
    // 相対パスが無いファイルはルートに配置
    if (!file.relativePath) {
      rootFiles.push(file);
      return;
    }

    // パスの部分を分解
    const folders = file.relativePath.split('/');
    const fileName = folders.pop() || ''; // 最後の部分（ファイル名）は除外

    // 現在処理中のフォルダ
    let currentFolder = newStructure;
    let currentPath = '';

    // 各フォルダレベルで処理
    folders.forEach((folder) => {
      // フォルダが作成済みでなければ作成
      currentPath = currentPath ? `${currentPath}/${folder}` : folder;

      if (!currentFolder.subfolders[folder]) {
        currentFolder.subfolders[folder] = {
          name: folder,
          path: currentPath,
          files: [],
          subfolders: {}
        };
      }

      currentFolder = currentFolder.subfolders[folder];
    });

    // 適切なフォルダにファイルを追加
    currentFolder.files.push(file);
  });

  // ルートレベルのファイルを追加
  newStructure.files = rootFiles;

  return newStructure;
};

/**
 * システムフォルダと禁止ファイル
 */
export const SYSTEM_FOLDERS = ['.git', 'node_modules', '.svn', '.hg', '.vscode'];
export const SYSTEM_FILES = ['.gitignore', 'HEAD', '.env', '.ds_store', '.DS_Store', 'Thumbs.db', 'COMMIT_EDITMSG'];
export const MAX_PATH_LENGTH = 250; // データベースのパスカラムの最大長を想定 