/**
 * ファイル処理に関するユーティリティ関数
 */

/**
 * ファイルサイズを人間が読みやすい形式に変換する
 */
export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * ファイルタイプを判別する
 */
export const getFileTypeInfo = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase() || '';

    // ファイルタイプとカラーのマッピング
    const fileTypes: Record<string, { type: string, color: string }> = {
        // 画像
        'jpg': { type: '画像', color: 'text-pink-500' },
        'jpeg': { type: '画像', color: 'text-pink-500' },
        'png': { type: '画像', color: 'text-pink-500' },
        'gif': { type: '画像', color: 'text-pink-500' },
        'webp': { type: '画像', color: 'text-pink-500' },

        // 3Dモデル
        'stl': { type: '3Dモデル', color: 'text-purple-500' },
        'obj': { type: '3Dモデル', color: 'text-purple-500' },
        'fbx': { type: '3Dモデル', color: 'text-purple-500' },
        '3mf': { type: '3Dモデル', color: 'text-purple-500' },

        // ドキュメント
        'pdf': { type: 'PDF', color: 'text-red-500' },
        'doc': { type: 'ドキュメント', color: 'text-blue-500' },
        'docx': { type: 'ドキュメント', color: 'text-blue-500' },
        'txt': { type: 'テキスト', color: 'text-gray-600' },

        // アーカイブ
        'zip': { type: 'ZIP', color: 'text-yellow-500' },
        'rar': { type: 'アーカイブ', color: 'text-yellow-500' },
        '7z': { type: 'アーカイブ', color: 'text-yellow-500' },

        // その他
        'gcode': { type: 'Gコード', color: 'text-green-500' }
    };

    return fileTypes[extension] || { type: '不明', color: 'text-gray-400' };
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