/**
 * ファイル処理に関するユーティリティ関数
 */

/**
 * ファイルサイズを人間が読みやすい形式にフォーマットする
 */
export const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * ZIPファイル名を生成する
 * UUIDをベースに特定のフォーマットでファイル名を生成する
 */
export const generateZipFileName = (articleId: string, folderPath: string): string => {
    const folderName = folderPath.split('/').filter(Boolean).pop() || articleId;

    // UUIDからフォルダ名を生成（アップロード時と同じ形式）
    const uuidParts = articleId.split('-');
    let zipFileName = folderName;
    
    if (uuidParts.length >= 2) {
        // 1つ目のパート（8桁）と2つ目のパート（最初の4桁）を使用
        const firstPart = uuidParts[0];           // 例: 39dab4d8
        const secondPart = uuidParts[1].substring(0, 4); // 例: f600 (f600から4文字)
        zipFileName = `3D-PRINTER-DOWNLOAD-DATA-${firstPart}-${secondPart}`;
        
        // フォルダ名も追加
        if (folderName !== articleId) {
            zipFileName += `_${folderName}`;
        }
    }

    return `${zipFileName}.zip`;
}; 