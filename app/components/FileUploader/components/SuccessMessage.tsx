'use client';

import { memo } from 'react';

interface SuccessMessageProps {
    show: boolean;
}

/**
 * 成功メッセージコンポーネント
 * ファイルのアップロードが成功した際に表示するメッセージ
 */
const SuccessMessage = ({ show }: SuccessMessageProps) => {
    if (!show) return null;

    return (
        <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            ファイルのアップロードが完了しました！
        </div>
    );
};

export default memo(SuccessMessage); 