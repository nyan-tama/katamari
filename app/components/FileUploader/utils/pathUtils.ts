/**
 * ファイルパス処理のためのユーティリティ関数
 */

/**
 * 親フォルダ名を生成する
 * UUID形式のarticleIdから親フォルダ名を生成します
 */
export const generateParentFolderName = (articleId: string): string => {
    const uuidParts = articleId.split('-');
    const firstPart = uuidParts[0];           // 例: 39dab4d8
    const secondPart = uuidParts[1]?.substring(0, 4) || ''; // 例: f600 (f600から4文字)
    return `3D-PRINTER-DOWNLOAD-DATA-${firstPart}-${secondPart}`;
};

/**
 * フォルダパスを生成する
 * ファイルオブジェクトと親フォルダ名からフォルダパスを生成します
 */
export const generateFolderPath = (file: File, parentFolderName: string, hasFolder: boolean): string => {
    let folderPath = '';

    // @ts-expect-error: webkitRelativePathはstandard DOMプロパティではない
    if (hasFolder && file.webkitRelativePath) {
        // @ts-expect-error: webkitRelativePathはstandard DOMプロパティではない
        const originalPath = file.webkitRelativePath;
        const pathParts = originalPath.split('/');

        // ファイル名を除いたパスを作成
        if (pathParts.length > 1) {
            // パスの最初の部分を親フォルダ名に置き換え
            folderPath = `${parentFolderName}/${originalPath.substring(0, originalPath.lastIndexOf('/'))}`;
        } else {
            // 単一階層の場合は親フォルダ直下
            folderPath = parentFolderName;
        }
    } else {
        // 単一ファイルの場合は親フォルダ直下
        folderPath = parentFolderName;
    }

    return folderPath;
};

/**
 * Supabase用のストレージパスを生成する
 * 安全なストレージパスを生成します（タイムスタンプ + エンコードされたファイル名）
 */
export const generateStoragePath = (articleId: string, fileName: string): string => {
    const timestamp = Date.now();
    const safeFileName = encodeURIComponent(fileName);
    return `${articleId}/${timestamp}_${safeFileName}`;
};

/**
 * フォルダアップロードかどうかを検出する
 */
export const detectFolderUpload = (files: File[]): boolean => {
    // @ts-expect-error: webkitRelativePathはstandard DOMプロパティではない
    return files.some(file => file.webkitRelativePath && file.webkitRelativePath.includes('/'));
};

/**
 * 元のフォルダ名を取得する
 * フォルダアップロードの場合、最初のファイルのパスから元のフォルダ名を抽出
 */
export const getOriginalFolderName = (files: File[]): string => {
    if (files.length === 0) return '';
    
    // @ts-expect-error: webkitRelativePathはstandard DOMプロパティではない
    const firstPath = files[0].webkitRelativePath || '';
    return firstPath.split('/')[0] || '';
};

/**
 * パスが長すぎるかどうかをチェックする
 */
export const isPathTooLong = (path: string, maxLength: number = 250): boolean => {
    return path.length > maxLength;
}; 