'use client';

import { useCallback, useState } from 'react';
import { FileUploaderProps, UploadedFileData, ErrorType } from './types';
import { uploadFiles } from './services/uploadService';
import CustomFileSelector from '../CustomFileSelector';
import ErrorDisplay from './components/ErrorDisplay';
import SuccessMessage from './components/SuccessMessage';
import UploadButton from './components/UploadButton';

/**
 * ファイルアップローダーコンポーネント
 * 記事に関連するファイルをアップロードするためのUIを提供する
 */
export default function FileUploader({ articleId, onFilesUploaded }: FileUploaderProps) {
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [errorType, setErrorType] = useState<ErrorType>('error');
    const [uploadSuccess, setUploadSuccess] = useState(false);

    // ファイル選択ハンドラ
    const handleFilesSelected = useCallback((selectedFiles: File[]) => {
        if (selectedFiles.length === 0) {
            setFiles([]);
            onFilesUploaded([]);
            return;
        }

        // ここには本来のファイル検証ロジックを追加すべきですが、
        // 現時点では単純化のため直接ファイルを設定します
        setFiles(selectedFiles);
    }, [onFilesUploaded]);

    // アップロード処理
    const handleUpload = async () => {
        if (files.length === 0) {
            setError('ファイルが選択されていません');
            return;
        }

        setUploading(true);
        setError(null);
        setUploadSuccess(false);

        try {
            // アップロードサービスを使用してファイルをアップロード
            const result = await uploadFiles(files, articleId);

            if (result.success) {
                setUploadSuccess(true);
                onFilesUploaded(result.files);
                setFiles([]); // ファイルリストをクリア
            } else {
                setError(result.error || 'アップロード中にエラーが発生しました');
                setErrorType('error');
            }
        } catch (err) {
            console.error('ファイルアップロードエラー:', err);
            setError('予期せぬエラーが発生しました');
            setErrorType('error');
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

                    <ErrorDisplay message={error} type={errorType} />
                    
                    <SuccessMessage show={uploadSuccess} />

                    {files.length > 0 && (
                        <div className="mt-4 flex justify-end">
                            <UploadButton 
                                onClick={handleUpload}
                                disabled={uploading}
                                uploading={uploading}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 