'use client';

import React, { FormEvent } from 'react';

interface ActionButtonsProps {
    onDraftClick: (e: FormEvent) => void;
    onPublishClick: (e: FormEvent) => void;
    isSubmitting: boolean;
    isDraft?: boolean;
}

/**
 * 制作物編集画面の操作ボタンコンポーネント
 */
export default function ActionButtons({
    onDraftClick,
    onPublishClick,
    isSubmitting,
    isDraft
}: ActionButtonsProps) {
    return (
        <div className="flex flex-wrap gap-4 justify-end">
            <button
                type="button"
                onClick={onDraftClick}
                disabled={isSubmitting}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 
                           transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="制作物を下書き保存します。後で編集を続けることができます。"
            >
                {isDraft === false ? '下書きに戻す' : '下書き保存'}
            </button>
            
            <button
                type="submit"
                onClick={onPublishClick}
                disabled={isSubmitting}
                className="px-6 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600 
                           transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="制作物を公開します。すべてのユーザーが閲覧できるようになります。"
            >
                {isSubmitting ? '保存中...' : isDraft === false ? '更新する' : '公開する'}
            </button>
        </div>
    );
} 