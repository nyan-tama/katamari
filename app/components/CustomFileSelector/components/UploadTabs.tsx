'use client';

interface UploadTabsProps {
  uploadMode: 'files' | 'folder';
  setUploadMode: (mode: 'files' | 'folder') => void;
}

const UploadTabs = ({ uploadMode, setUploadMode }: UploadTabsProps) => {
  return (
    <div className="flex mb-4 border-b">
      <button
        className={`px-4 py-2 ${uploadMode === 'files' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-600'}`}
        onClick={() => setUploadMode('files')}
      >
        ファイルをアップロード
      </button>
      <button
        className={`px-4 py-2 ${uploadMode === 'folder' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-600'}`}
        onClick={() => setUploadMode('folder')}
      >
        フォルダをアップロード
      </button>
    </div>
  );
};

export default UploadTabs; 