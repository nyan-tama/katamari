'use client';

import { FolderNode, ExtendedFile } from '../types';
import FolderView from './FolderView';

interface FileListProps {
  files: ExtendedFile[];
  folderStructure: FolderNode;
  expandedFolders: Record<string, boolean>;
  toggleFolder: (path: string) => void;
  clearFiles: () => void;
}

const FileList = ({ files, folderStructure, expandedFolders, toggleFolder, clearFiles }: FileListProps) => {
  if (files.length === 0) return null;

  return (
    <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">選択済みファイル ({files.length})</h3>
        <button
          type="button"
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          onClick={clearFiles}
        >
          クリア
        </button>
      </div>

      <div>
        <FolderView
          folder={folderStructure}
          path=""
          expandedFolders={expandedFolders}
          toggleFolder={toggleFolder}
        />
      </div>

      <div className="mt-4 bg-yellow-50 p-3 rounded-md text-sm text-yellow-700">
        <p className="font-medium">注意</p>
        <p>新たにアップロードすると今アップロードしているファイルはすべて置き換えられます</p>
        <p className="mt-1">一度にファイル選択をしアップロードするか、フォルダごとアップロードしましょう</p>
      </div>
    </div>
  );
};

export default FileList; 