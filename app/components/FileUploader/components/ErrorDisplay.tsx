'use client';

import { memo } from 'react';
import { ErrorType } from '../types';

interface ErrorDisplayProps {
    message: string | null;
    type: ErrorType;
}

/**
 * エラーメッセージ表示コンポーネント
 * エラーまたは警告メッセージを表示します
 */
const ErrorDisplay = ({ message, type }: ErrorDisplayProps) => {
    if (!message) return null;

    return (
        <div className={`mt-4 ${type === 'error'
            ? 'bg-red-50 border-2 border-red-400 text-red-700'
            : 'bg-yellow-50 border-2 border-yellow-400 text-yellow-700'} px-4 py-3 rounded`}>
            <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">{type === 'error' ? 'エラー' : '注意'}</span>
            </div>
            <div className="mt-1 whitespace-pre-line">{message}</div>
        </div>
    );
};

export default memo(ErrorDisplay); 