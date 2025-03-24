'use client';

interface FolderSelectorProps {
  onFolderSelect: (evt: React.ChangeEvent<HTMLInputElement>) => void;
}

const FolderSelector = ({ onFolderSelect }: FolderSelectorProps) => {
  return (
    <div className="border-2 border-dashed rounded-lg p-6 text-center">
      <input
        type="file"
        // @ts-expect-error: webkitdirectoryは標準のHTMLAttributeではないが、ブラウザでは動作する
        webkitdirectory="true"
        // @ts-expect-error: directoryも標準のHTMLAttributeではないが、ブラウザでは動作する
        directory=""
        multiple
        onChange={onFolderSelect}
        className="hidden"
        id="folder-input"
      />
      <label
        htmlFor="folder-input"
        className="cursor-pointer block w-full h-full"
      >
        <div>
          <p>クリックしてフォルダを選択してください</p>
          <p className="text-sm text-gray-500 mt-1">フォルダ内のすべてのファイル（サブフォルダ含む）がアップロードされます</p>
          <p className="text-sm text-gray-500">フォルダ構造は保持されます</p>
          <p className="text-sm text-gray-500 text-red-500">※空のフォルダはブラウザの制限により検出されません</p>
        </div>
      </label>
    </div>
  );
};

export default FolderSelector; 