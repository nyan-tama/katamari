// webkitRelativePath プロパティをサポートするために File 型を拡張
export interface ExtendedFile extends File {
  webkitRelativePath?: string;
}

// システムフォルダ定義
export const SYSTEM_FOLDERS = ['.git', 'node_modules', '.svn', '.hg', '.vscode'];

// システムファイル定義
export const SYSTEM_FILES = ['.gitignore', 'HEAD', '.env', '.DS_Store', 'Thumbs.db', 'COMMIT_EDITMSG'];

/**
 * ファイルがシステムフォルダのパスを含むかチェック
 */
export function isSystemFolderPath(file: File): boolean {
  const extendedFile = file as ExtendedFile;
  const relativePath = extendedFile.webkitRelativePath || '';
  
  if (!relativePath || !relativePath.includes('/')) return false;
  
  const pathParts = relativePath.split('/');
  return pathParts.some(part => SYSTEM_FOLDERS.includes(part));
}

/**
 * ファイルがシステムファイルかチェック
 */
export function isSystemFile(file: File): boolean {
  const fileName = file.name.toLowerCase();
  return SYSTEM_FILES.includes(fileName);
}

/**
 * 検出されたシステムフォルダの名前を取得
 */
export function getDetectedSystemFolder(file: File): string {
  const extendedFile = file as ExtendedFile;
  const relativePath = extendedFile.webkitRelativePath || '';
  
  if (!relativePath || !relativePath.includes('/')) return '';
  
  const pathParts = relativePath.split('/');
  for (const part of pathParts) {
    if (SYSTEM_FOLDERS.includes(part)) {
      return part;
    }
  }
  
  return '';
}

/**
 * ファイルアレイからシステムファイルをフィルタリング
 */
export function filterSystemFiles(files: File[]): {
  safeFiles: File[];
  systemFolderFiles: File[];
  detectedSystemFolder: string;
} {
  const systemFolderFiles: File[] = [];
  let detectedSystemFolder = '';
  
  const safeFiles = files.filter(file => {
    // システムファイルチェック
    if (isSystemFile(file)) {
      return false;
    }
    
    // システムフォルダパスチェック
    if (isSystemFolderPath(file)) {
      const folder = getDetectedSystemFolder(file);
      if (!detectedSystemFolder && folder) {
        detectedSystemFolder = folder;
      }
      systemFolderFiles.push(file);
      return false;
    }
    
    return true;
  });
  
  return {
    safeFiles,
    systemFolderFiles,
    detectedSystemFolder
  };
} 