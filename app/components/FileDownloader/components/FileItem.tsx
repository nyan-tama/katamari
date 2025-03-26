'use client';

import { memo } from 'react';
import {
    DocumentIcon,
    PhotoIcon,
    DocumentTextIcon,
    ArchiveBoxIcon,
    CubeIcon,
    ArrowDownTrayIcon as DownloadIcon
} from '@heroicons/react/24/outline';
import { FileData } from '../types';
import { formatFileSize, getFileTypeInfo } from '../utils/fileUtils';

interface FileItemProps {
    file: FileData;
    onDownload: (file: FileData) => void;
}

/**
 * ファイルタイプに応じたアイコンを返す
 */
const FileTypeIcon = ({ filename, className }: { filename: string, className: string }) => {
    const extension = filename.split('.').pop()?.toLowerCase() || '';

    // 拡張子に基づいて適切なアイコンを返す
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
        return <PhotoIcon className={className} />;
    } else if (['stl', 'obj', 'fbx', '3mf'].includes(extension)) {
        return <CubeIcon className={className} />;
    } else if (['pdf', 'doc', 'docx', 'txt'].includes(extension)) {
        return <DocumentTextIcon className={className} />;
    } else if (['zip', 'rar', '7z'].includes(extension)) {
        return <ArchiveBoxIcon className={className} />;
    }

    return <DocumentIcon className={className} />;
};

/**
 * ファイルアイテムを表示するコンポーネント
 */
const FileItem = ({ file, onDownload }: FileItemProps) => {
    const { color } = getFileTypeInfo(file.original_name);

    return (
        <li className="flex items-center py-2 px-3 hover:bg-gray-50">
            <FileTypeIcon filename={file.original_name} className={`h-5 w-5 mr-2 ${color}`} />
            <span className="truncate flex-grow">{file.original_name}</span>
            <span className="text-sm text-gray-500 mx-2">
                {formatFileSize(file.file_size)}
            </span>
            <button
                onClick={() => onDownload(file)}
                className="text-blue-600 hover:text-blue-800 px-3 py-1 text-sm rounded hover:bg-blue-50"
            >
                <DownloadIcon className="h-4 w-4" />
            </button>
        </li>
    );
};

export default memo(FileItem); 