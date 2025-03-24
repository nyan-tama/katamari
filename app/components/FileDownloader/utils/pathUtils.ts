/**
 * ファイルパス処理のためのユーティリティ関数
 */

/**
 * 安全なパスを生成する関数
 * ファイル名やパスに日本語などが含まれる場合に適切にエンコードする
 */
export const createSafePath = (originalPath: string): string => {
    if (!originalPath) return '';

    // パスが既にエンコードされているか確認
    if (originalPath.includes('%')) {
        try {
            // 一度デコードしてみる
            const decoded = decodeURIComponent(originalPath);
            console.log('パスをデコードしました:', {
                original: originalPath,
                decoded
            });
            originalPath = decoded;
        } catch (err) {
            console.log('デコード失敗 - 元のパスを使用します:', originalPath);
        }
    }

    // より単純なエンコード方法を使用
    // パス部分とファイル名部分を分ける
    const lastSlashIndex = originalPath.lastIndexOf('/');
    if (lastSlashIndex === -1) {
        // スラッシュがない場合は単純にエンコード
        return encodeURIComponent(originalPath);
    }

    // パス部分とファイル名部分を別々に処理
    const pathPart = originalPath.substring(0, lastSlashIndex);
    const fileName = originalPath.substring(lastSlashIndex + 1);

    // パスの各セグメントを個別にエンコード
    const encodedPath = pathPart.split('/')
        .map(segment => encodeURIComponent(segment))
        .join('/');

    // ファイル名をエンコード
    const encodedFileName = encodeURIComponent(fileName);

    // 結合
    const result = `${encodedPath}/${encodedFileName}`;

    console.log('パスのエンコード処理:', {
        originalPath,
        result
    });

    return result;
};

/**
 * 代替パスを生成する関数
 * 日本語パスが問題になる場合のバックアップとして、
 * articleIdとファイル名だけの単純なパスを生成する
 */
export const createAlternativePath = (storagePath: string, articleId: string): string => {
    if (!storagePath || !storagePath.includes('/')) return '';

    const pathParts = storagePath.split('/');
    const fileName = pathParts.pop() || '';

    if (!fileName) return '';

    // アーティクルIDと最後のファイル名のみを使用する単純な代替パス
    const alternativePath = `${articleId}/${encodeURIComponent(fileName)}`;

    console.log('生成した単純な代替パス:', {
        originalPath: storagePath,
        alternativePath
    });

    return alternativePath;
}; 