'use client';

import { useState } from 'react';

interface HeroImageUploaderProps {
    onImageSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
    currentImageUrl?: string | null;
    error?: string | null;
}

/**
 * メイン画像アップロードコンポーネント
 */
export default function HeroImageUploader({
    onImageSelected,
    currentImageUrl,
    error
}: HeroImageUploaderProps) {
    const [imagePreview, setImagePreview] = useState<string | null>(currentImageUrl || null);

    // 内部でのイメージ変更ハンドラ（プレビュー用）
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // プレビュー用のURLを作成
            const objectUrl = URL.createObjectURL(file);
            setImagePreview(objectUrl);
        }
        
        // 親コンポーネントのハンドラを呼び出す
        onImageSelected(e);
    };

    return (
        <div className="mb-6">
            <label htmlFor="heroImage" className="block text-sm font-medium text-gray-700 mb-1">
                メイン画像（オプション）
            </label>
            <input
                type="file"
                id="heroImage"
                accept="image/*"
                onChange={handleChange}
                className="w-full"
            />
            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
            {imagePreview && (
                <div className="mt-2">
                    <img
                        src={imagePreview}
                        alt="メイン画像プレビュー"
                        className="max-h-64 object-cover rounded-md"
                    />
                </div>
            )}
        </div>
    );
} 