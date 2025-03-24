'use client';

import { memo } from 'react';
import { DocumentIcon, ArrowDownTrayIcon as DownloadIcon } from '@heroicons/react/24/outline';
import { FileData } from '../types';
import { formatFileSize } from '../utils/fileUtils';

interface FileItemProps {
    file: FileData;
    onDownload: (file: FileData) => void;
}

/**
 * ファイルアイテムを表示するコンポーネント
 */
const FileItem = ({ file, onDownload }: FileItemProps) => {
    return (
        <li className="flex items-center py-2 px-3 hover:bg-gray-50">
            <DocumentIcon className="h-5 w-5 mr-2 text-gray-400" />
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