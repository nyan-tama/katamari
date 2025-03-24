'use client';

import { memo } from 'react';

interface UploadButtonProps {
    onClick: () => void;
    disabled: boolean;
    uploading: boolean;
}

/**
 * アップロードボタンコンポーネント
 * ファイルのアップロードを開始するためのボタン
 */
const UploadButton = ({ onClick, disabled, uploading }: UploadButtonProps) => {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md flex items-center gap-2 disabled:opacity-50"
        >
            {uploading ? (
                <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    アップロード中...
                </>
            ) : (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
                    </svg>
                    ファイルをアップロード
                </>
            )}
        </button>
    );
};

export default memo(UploadButton); 