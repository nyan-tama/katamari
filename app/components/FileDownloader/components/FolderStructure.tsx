'use client';

import { memo } from 'react';
import { FolderIcon, ChevronRightIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { FolderNode, FileData } from '../types';
import FileItem from './FileItem';

interface FolderStructureProps {
    folder: FolderNode;
    path?: string;
    expandedFolders: Record<string, boolean>;
    onToggleFolder: (path: string) => void;
    onDownloadFile: (file: FileData) => void;
    onDownloadFolder: (path: string) => void;
    downloadingFolder: string | null;
}

/**
 * フォルダ構造を再帰的に表示するコンポーネント
 */
const FolderStructure = ({
    folder,
    path = '',
    expandedFolders,
    onToggleFolder,
    onDownloadFile,
    onDownloadFolder,
    downloadingFolder
}: FolderStructureProps) => {
    const isExpanded = folder.isExpanded || !!expandedFolders[path];
    const hasFiles = folder.files.length > 0;
    const hasSubfolders = Object.keys(folder.subfolders).length > 0;

    // ルートフォルダの場合は特別な表示
    if (folder.name === 'root') {
        return (
            <div>
                {/* ルートレベルのファイル */}
                {hasFiles && (
                    <ul className="divide-y border-t border-b">
                        {folder.files.map(file => (
                            <FileItem 
                                key={file.id} 
                                file={file}
                                onDownload={onDownloadFile} 
                            />
                        ))}
                    </ul>
                )}

                {/* サブフォルダー */}
                {Object.values(folder.subfolders).map(subfolder => (
                    <FolderStructure
                        key={subfolder.path}
                        folder={subfolder}
                        path={subfolder.path}
                        expandedFolders={expandedFolders}
                        onToggleFolder={onToggleFolder}
                        onDownloadFile={onDownloadFile}
                        onDownloadFolder={onDownloadFolder}
                        downloadingFolder={downloadingFolder}
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="mb-4">
            <div
                className="flex items-center py-2 px-3 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
                onClick={() => onToggleFolder(path)}
            >
                {isExpanded ? (
                    <ChevronDownIcon className="h-4 w-4 mr-1 text-gray-500" />
                ) : (
                    <ChevronRightIcon className="h-4 w-4 mr-1 text-gray-500" />
                )}
                <FolderIcon className="h-5 w-5 mr-2 text-yellow-500" />
                <span className="font-medium">{folder.name}</span>
                <span className="ml-2 text-sm text-gray-500">
                    ({folder.files.length}ファイル
                    {hasSubfolders && `, ${Object.keys(folder.subfolders).length}フォルダ`})
                </span>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDownloadFolder(folder.path);
                    }}
                    disabled={!!downloadingFolder}
                    className="ml-auto text-blue-600 hover:text-blue-800 px-3 py-1 text-sm rounded hover:bg-blue-50"
                >
                    {downloadingFolder === folder.path ? '処理中...' : 'ZIP でダウンロード'}
                </button>
            </div>

            {isExpanded && (
                <div className="pl-6 border-l ml-4 mt-2">
                    {/* サブフォルダのファイル */}
                    {hasFiles && (
                        <ul className="divide-y border-t border-b mb-4">
                            {folder.files.map(file => (
                                <FileItem 
                                    key={file.id} 
                                    file={file}
                                    onDownload={onDownloadFile} 
                                />
                            ))}
                        </ul>
                    )}

                    {/* 更に深いサブフォルダー */}
                    {Object.values(folder.subfolders).map(subfolder => (
                        <FolderStructure
                            key={subfolder.path}
                            folder={subfolder}
                            path={subfolder.path}
                            expandedFolders={expandedFolders}
                            onToggleFolder={onToggleFolder}
                            onDownloadFile={onDownloadFile}
                            onDownloadFolder={onDownloadFolder}
                            downloadingFolder={downloadingFolder}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default memo(FolderStructure); 