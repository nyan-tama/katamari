'use client';

import { useDropzone } from 'react-dropzone';

interface DropZoneProps {
  onDrop: (acceptedFiles: File[]) => void;
}

const DropZone = ({ onDrop }: DropZoneProps) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    // accept制限を削除し、あらゆるファイルタイプを許可
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
        ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
    >
      <input {...getInputProps()} />
      {isDragActive ? (
        <p className="text-blue-500">ファイルをドロップしてください...</p>
      ) : (
        <div>
          <p>ファイルをドラッグ＆ドロップするか、クリックして選択してください</p>
          <p className="text-sm text-gray-500 mt-1">最大サイズ: 50MB、あらゆるファイル形式に対応</p>
          <p className="text-sm text-gray-500">※フォルダごとアップロードする場合は、上部の「フォルダをアップロード」タブを選択してください</p>
        </div>
      )}
    </div>
  );
};

export default DropZone; 