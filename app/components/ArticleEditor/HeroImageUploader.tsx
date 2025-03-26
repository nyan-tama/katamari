'use client';

import { useState } from 'react';
import Image from 'next/image';

interface HeroImageUploaderProps {
    currentImageUrl?: string | null;
    onImageSelected: (file: File) => void;
    error?: string | null;
}

/**
 * メイン画像アップロードコンポーネント
 */
export default function HeroImageUploader({
    currentImageUrl,
    onImageSelected,
    error
}: HeroImageUploaderProps) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);

    // メイン画像の選択ハンドラ
    const handleHeroImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // ファイルタイプの検証
        if (!file.type.startsWith('image/')) {
            console.error('画像ファイルのみアップロードできます');
            return;
        }

        // ファイルサイズの検証（5MB上限）
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            console.error('画像サイズは5MB以下にしてください');
            return;
        }

        // 選択されたファイルを親コンポーネントに通知
        onImageSelected(file);

        // プレビューを設定
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
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
                onChange={handleHeroImageChange}
                className="w-full"
            />
            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
            {previewUrl && (
                <div className="mt-2">
                    <img
                        src={previewUrl}
                        alt="メイン画像プレビュー"
                        className="max-h-64 object-cover rounded-md"
                    />
                </div>
            )}
        </div>
    );
} 