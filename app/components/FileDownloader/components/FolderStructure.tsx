'use client';

import { memo } from 'react';
import { FolderIcon, ChevronRightIcon, ChevronDownIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
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
    // ルートフォルダは常に展開、それ以外はexpandedFoldersの状態に従う
    const isExpanded = folder.name === 'root' || !!expandedFolders[path];
    const hasFiles = folder.files.length > 0;
    // サブフォルダが存在するかの判定を修正
    const hasSubfolders = Object.keys(folder.subfolders || {}).length > 0;

    // デバッグ用にコンソールに出力
    if (folder.path) {
        console.log(`フォルダ: ${folder.path}, サブフォルダあり: ${hasSubfolders}, サブフォルダ数: ${Object.keys(folder.subfolders || {}).length}`);
    }

    // フォルダの深さを計算（スラッシュの数で判定）
    const folderDepth = folder.path ? folder.path.split('/').filter(Boolean).length : 0;
    const isRootLevelFolder = folderDepth === 1; // ルート直下のフォルダ

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
        <div className="space-y-2">
            {/* フォルダヘッダー（ルートフォルダ以外で表示） */}
            {folder.path && (
                <div
                    className="flex items-center gap-2 bg-yellow-50/80 hover:bg-yellow-100/80 rounded-md px-2 py-1.5 transition-colors group cursor-pointer"
                    onClick={() => onToggleFolder(folder.path)}
                >
                    <button
                        className="p-1 hover:bg-yellow-200/50 rounded-md transition-colors"
                        aria-label={isExpanded ? 'フォルダを閉じる' : 'フォルダを開く'}
                        onClick={(e) => {
                            e.stopPropagation(); // イベント伝播を防止
                            onToggleFolder(folder.path);
                        }}
                    >
                        {isExpanded
                            ? <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                            : <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                        }
                    </button>
                    <FolderIcon className="h-5 w-5 text-secondary" />
                    <span className="text-sm font-medium text-gray-700">
                        {folder.name}
                        {!isRootLevelFolder && (
                            <span className="text-gray-500 ml-2">
                                ({folder.files.length}ファイル
                                {hasSubfolders && `, ${Object.keys(folder.subfolders).length}フォルダ`})
                            </span>
                        )}
                    </span>
                    {!isRootLevelFolder && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation(); // イベント伝播を防止
                                onDownloadFolder(folder.path);
                            }}
                            disabled={!!downloadingFolder}
                            className="ml-2 p-1 text-gray-500 hover:text-gray-700 hover:bg-yellow-200/50 rounded-md transition-colors disabled:opacity-50"
                            title="フォルダをZIPでダウンロード"
                        >
                            {downloadingFolder === folder.path ? (
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <ArrowDownTrayIcon className="h-4 w-4" />
                            )}
                        </button>
                    )}
                </div>
            )}

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
                    {Object.values(folder.subfolders || {}).map(subfolder => {
                        // デバッグ情報
                        console.log(`サブフォルダ表示: ${subfolder.path}, サブフォルダ数: ${Object.keys(subfolder.subfolders || {}).length}`);
                        return (
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
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default memo(FolderStructure); 