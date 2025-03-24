import { useState } from 'react';

interface UseHeroImageProps {
  setError: (error: string | null) => void;
}

export function useHeroImage({ setError }: UseHeroImageProps) {
  const [heroImage, setHeroImage] = useState<File | null>(null);
  const [heroImagePreview, setHeroImagePreview] = useState<string | null>(null);

  const handleHeroImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイルタイプの検証
    if (!file.type.startsWith('image/')) {
      setError('画像ファイルのみアップロードできます');
      return;
    }

    // ファイルサイズの検証（5MB上限）
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError('画像サイズは5MB以下にしてください');
      return;
    }

    setHeroImage(file);
    const objectUrl = URL.createObjectURL(file);
    setHeroImagePreview(objectUrl);
    // エラーメッセージをクリア
    setError(null);
  };

  return {
    heroImage,
    heroImagePreview,
    handleHeroImageChange
  };
} 