// app/components/FileDownloader/components/FileItem.tsx
'use client';

import { memo, useState } from 'react';
import {
    DocumentIcon,
    PhotoIcon,
    DocumentTextIcon,
    ArchiveBoxIcon,
    CubeIcon,
    ArrowDownTrayIcon as DownloadIcon,
    EyeIcon
} from '@heroicons/react/24/outline';
import { FileData } from '../types';
import { formatFileSize, getFileTypeInfo } from '../utils/fileUtils';
import ModelPreviewModal from './ModelPreviewModal';

interface FileItemProps {
    file: FileData;
    onDownload: (file: FileData) => void;
    articleId: string;
}

/**
 * ファイルがプレビュー可能かどうかを判定する関数
 */
const isPreviewable = (filename: string): boolean => {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    return ['stl', 'obj'].includes(extension);
};

/**
 * ファイルアイテムを表示するコンポーネント
 */
const FileItem = ({ file, onDownload, articleId }: FileItemProps) => {
    const [previewOpen, setPreviewOpen] = useState(false);
    const { color } = getFileTypeInfo(file.original_name);
    const canPreview = isPreviewable(file.original_name);

    return (
        <>
            <li className="flex items-center py-2 px-3 hover:bg-gray-50">
                <CubeIcon className={`h-5 w-5 mr-2 ${color}`} />
                <span className="truncate flex-grow">{file.original_name}</span>
                <span className="text-sm text-gray-500 mx-2">
                    {formatFileSize(file.file_size)}
                </span>

                {/* プレビューボタン（3Dファイルのみ表示） */}
                {canPreview && (
                    <button
                        onClick={() => setPreviewOpen(true)}
                        className="text-blue-600 hover:text-blue-800 px-2 py-1 text-sm rounded hover:bg-blue-50 mr-1"
                        title="3Dプレビュー"
                    >
                        <EyeIcon className="h-4 w-4" />
                    </button>
                )}

                {/* ダウンロードボタン */}
                <button
                    onClick={() => onDownload(file)}
                    className="text-blue-600 hover:text-blue-800 px-3 py-1 text-sm rounded hover:bg-blue-50"
                    title="ダウンロード"
                >
                    <DownloadIcon className="h-4 w-4" />
                </button>
            </li>

            {/* プレビューモーダル */}
            <ModelPreviewModal
                isOpen={previewOpen}
                onClose={() => setPreviewOpen(false)}
                fileData={file}
                articleId={articleId}
            />
        </>
    );
};

export default memo(FileItem);