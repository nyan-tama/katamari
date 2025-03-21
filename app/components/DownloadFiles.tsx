'use client';

import { useState } from 'react';

interface DownloadFile {
    id: string;
    storage_path: string;
    file_size: number;
    file_type: string | null;
    storage_bucket: string;
    original_name: string;
}

interface DownloadFilesProps {
    articleId: string;
    files: DownloadFile[];
}

export default function DownloadFiles({ articleId, files }: DownloadFilesProps) {
    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (files.length === 0) {
        return (
            <div className="mt-8 bg-yellow-100 rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">ダウンロードファイル</h2>
                <p className="text-gray-700">この記事にはダウンロードファイルがありません</p>
            </div>
        );
    }

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const handleDownload = async () => {
        try {
            setIsDownloading(true);
            setError(null);

            // ダウンロードAPIを呼び出す
            const response = await fetch(`/api/download-zip?articleId=${articleId}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'ダウンロード中にエラーが発生しました');
            }

            // レスポンスをBlobとして取得
            const blob = await response.blob();

            // Content-Dispositionからファイル名を取得（サーバー側の命名を使用）
            let fileName = '';
            const contentDisposition = response.headers.get('content-disposition');
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="(.+?)"/);
                if (fileNameMatch && fileNameMatch[1]) {
                    fileName = fileNameMatch[1];
                }
            }

            // ファイル名が取得できなかった場合のフォールバック
            if (!fileName) {
                // UUIDからフォルダ名を生成（アップロード時と同じ形式）
                const uuidParts = articleId.split('-');
                if (uuidParts.length >= 2) {
                    // 1つ目のパート（8桁）と2つ目のパート（最初の4桁）を使用
                    const firstPart = uuidParts[0];           // 例: 39dab4d8
                    const secondPart = uuidParts[1].substring(0, 4); // 例: f600 (f600から4文字)
                    fileName = `3D-PRINTER-DOWNLOAD-DATA-${firstPart}-${secondPart}.zip`;
                } else {
                    fileName = `download-${articleId}.zip`;
                }
            }

            // ダウンロードリンクを作成
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);

            // リンクをクリックしてダウンロード開始
            a.click();

            // クリーンアップ
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error(`${files[0].original_name}のダウンロードに失敗しました:`, err);
            setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">ダウンロードファイル</h2>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            <div className="border rounded-lg overflow-hidden mb-4">
                <table className="w-full">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="px-4 py-2 text-left">ファイル名</th>
                            <th className="px-4 py-2 text-right">サイズ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {files.map(file => (
                            <tr key={file.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3">{file.original_name}</td>
                                <td className="px-4 py-3 text-right text-gray-600">{formatFileSize(file.file_size)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-center">
                <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-md flex items-center gap-2 disabled:opacity-50"
                >
                    {isDownloading ? (
                        <>
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            ダウンロード中...
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                            </svg>
                            ZIPでダウンロード
                        </>
                    )}
                </button>
            </div>
        </div>
    );
} 