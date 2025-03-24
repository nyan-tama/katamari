'use client';

import { FolderIcon, ChevronRightIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import FileItem from './FileItem';
import { FolderNode } from '../types';

interface FolderViewProps {
  folder: FolderNode;
  path?: string;
  expandedFolders: Record<string, boolean>;
  toggleFolder: (path: string) => void;
}

const FolderView = ({ folder, path = '', expandedFolders, toggleFolder }: FolderViewProps) => {
  // ルートフォルダは常に展開、それ以外はexpandedFoldersの状態に従う
  const isExpanded = path === '' || !!expandedFolders[path];
  const hasFiles = folder.files.length > 0;
  const hasSubfolders = Object.keys(folder.subfolders).length > 0;

  // ルートフォルダの特別処理
  if (folder.name === 'root') {
    return (
      <div>
        {/* ルートレベルのファイル */}
        {hasFiles && (
          <ul className="divide-y border-t border-b mb-4">
            {folder.files.map((file, index) => (
              <FileItem key={`root-${index}`} file={file} />
            ))}
          </ul>
        )}

        {/* サブフォルダー */}
        {Object.entries(folder.subfolders).map(([folderName, subfolder]) => {
          // 3D-PRINTER-DOWNLOAD-DATA- で始まるフォルダは特別処理
          if (/^3D-PRINTER-DOWNLOAD-DATA-[a-f0-9]{8}-[a-f0-9]{4}$/i.test(folderName)) {
            // フォルダ自体は表示せず、その中身を直接表示するが、
            // サブフォルダには通常の開閉機能を持たせる
            return (
              <div key={subfolder.path}>
                {/* このフォルダ内のファイル */}
                {subfolder.files.length > 0 && (
                  <ul className="divide-y border-t border-b mb-4">
                    {subfolder.files.map((file, idx) => (
                      <FileItem key={`special-${idx}`} file={file} />
                    ))}
                  </ul>
                )}

                {/* このフォルダ内のサブフォルダ - フォルダ操作UIを表示 */}
                {Object.entries(subfolder.subfolders).map(([subName, nestedFolder]) => {
                  const nestedPath = nestedFolder.path;
                  const isNestedExpanded = !!expandedFolders[nestedPath];

                  return (
                    <div key={nestedPath} className="mb-4">
                      <div
                        className="flex items-center py-2 px-3 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
                        onClick={() => toggleFolder(nestedPath)}
                      >
                        {isNestedExpanded ? (
                          <ChevronDownIcon className="h-4 w-4 mr-1 text-gray-500" />
                        ) : (
                          <ChevronRightIcon className="h-4 w-4 mr-1 text-gray-500" />
                        )}
                        <FolderIcon className="h-5 w-5 mr-2 text-yellow-500" />
                        <span className="font-medium">{subName}</span>
                        <span className="ml-2 text-sm text-gray-500">
                          ({nestedFolder.files.length}ファイル
                          {Object.keys(nestedFolder.subfolders).length > 0 &&
                            `, ${Object.keys(nestedFolder.subfolders).length}フォルダ`})
                        </span>
                      </div>

                      {isNestedExpanded && (
                        <div className="pl-6 border-l ml-4 mt-2">
                          {/* サブフォルダのファイル */}
                          {nestedFolder.files.length > 0 && (
                            <ul className="divide-y border-t border-b mb-4">
                              {nestedFolder.files.map((file, index) => (
                                <FileItem key={`${nestedPath}-${index}`} file={file} />
                              ))}
                            </ul>
                          )}

                          {/* 更に深いサブフォルダー */}
                          {Object.values(nestedFolder.subfolders).map(deepFolder => (
                            <FolderView
                              key={deepFolder.path}
                              folder={deepFolder}
                              path={deepFolder.path}
                              expandedFolders={expandedFolders}
                              toggleFolder={toggleFolder}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          }

          // 通常のフォルダの処理
          const folderPath = subfolder.path;
          const isFolderExpanded = !!expandedFolders[folderPath];

          return (
            <div key={folderPath} className="mb-4">
              <div
                className="flex items-center py-2 px-3 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
                onClick={() => toggleFolder(folderPath)}
              >
                {isFolderExpanded ? (
                  <ChevronDownIcon className="h-4 w-4 mr-1 text-gray-500" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4 mr-1 text-gray-500" />
                )}
                <FolderIcon className="h-5 w-5 mr-2 text-yellow-500" />
                <span className="font-medium">{folderName}</span>
                <span className="ml-2 text-sm text-gray-500">
                  ({subfolder.files.length}ファイル
                  {Object.keys(subfolder.subfolders).length > 0 &&
                    `, ${Object.keys(subfolder.subfolders).length}フォルダ`})
                </span>
              </div>

              {isFolderExpanded && (
                <div className="pl-6 border-l ml-4 mt-2">
                  {/* サブフォルダのファイル */}
                  {subfolder.files.length > 0 && (
                    <ul className="divide-y border-t border-b mb-4">
                      {subfolder.files.map((file, index) => (
                        <FileItem key={`${folderPath}-${index}`} file={file} />
                      ))}
                    </ul>
                  )}

                  {/* 更に深いサブフォルダー */}
                  {Object.values(subfolder.subfolders).map(deepFolder => (
                    <FolderView
                      key={deepFolder.path}
                      folder={deepFolder}
                      path={deepFolder.path}
                      expandedFolders={expandedFolders}
                      toggleFolder={toggleFolder}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div
        className="flex items-center py-2 px-3 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
        onClick={() => toggleFolder(path)}
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
      </div>

      {isExpanded && (
        <div className="pl-6 border-l ml-4 mt-2">
          {/* サブフォルダのファイル */}
          {hasFiles && (
            <ul className="divide-y border-t border-b mb-4">
              {folder.files.map((file, index) => (
                <FileItem key={`${path}-${index}`} file={file} />
              ))}
            </ul>
          )}

          {/* 更に深いサブフォルダー */}
          {Object.values(folder.subfolders).map(subfolder => (
            <FolderView
              key={subfolder.path}
              folder={subfolder}
              path={subfolder.path}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FolderView; 