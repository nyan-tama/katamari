'use client';

import { DocumentIcon } from '@heroicons/react/24/outline';
import { ExtendedFile } from '../types';
import { formatFileSize } from '../utils/fileUtils';

interface FileItemProps {
  file: ExtendedFile;
}

const FileItem = ({ file }: FileItemProps) => {
  // 元のFileオブジェクトかExtendedFileから適切なプロパティを取得
  const originalFile = file.originalFile || file;
  const fileName = originalFile.name || file.name || '不明なファイル';
  const fileSize = originalFile.size || file.size || 0;

  return (
    <li className="flex items-center py-2 px-3 hover:bg-gray-50">
      <DocumentIcon className="h-5 w-5 mr-2 text-gray-400" />
      <span className="truncate flex-grow">{fileName}</span>
      <span className="text-sm text-gray-500 mx-2">
        {formatFileSize(fileSize)}
      </span>
    </li>
  );
};

export default FileItem; 