'use client';

interface ActionButtonsProps {
    onCancel: () => void;
    onSaveDraft: () => void;
    onPublish: () => void;
    isSubmitting: boolean;
    articleStatus?: 'draft' | 'published';
}

/**
 * 記事編集ページのアクションボタンコンポーネント
 */
export default function ActionButtons({
    onCancel,
    onSaveDraft,
    onPublish,
    isSubmitting,
    articleStatus = 'draft'
}: ActionButtonsProps) {
    return (
        <div className="flex justify-between">
            <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
                キャンセル
            </button>

            <div className="flex gap-4">
                <button
                    type="button"
                    onClick={onSaveDraft}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                >
                    下書き保存
                </button>
                <button
                    type="button"
                    onClick={onPublish}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                >
                    {articleStatus === 'published' ? '更新する' : '公開する'}
                </button>
            </div>
        </div>
    );
} 