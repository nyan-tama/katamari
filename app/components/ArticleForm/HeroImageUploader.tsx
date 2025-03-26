import React from 'react';

interface HeroImageUploaderProps {
  onHeroImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  heroImagePreview: string | null;
}

export function HeroImageUploader({ onHeroImageChange, heroImagePreview }: HeroImageUploaderProps) {
  return (
    <div className="mb-6">
      <label htmlFor="heroImage" className="block text-sm font-medium text-gray-700 mb-1">
        メイン画像（オプション）
      </label>
      <input
        type="file"
        id="heroImage"
        accept="image/*"
        onChange={onHeroImageChange}
        className="w-full"
      />
      {heroImagePreview && (
        <div className="mt-2">
          <img
            src={heroImagePreview}
            alt="メイン画像プレビュー"
            className="w-full max-h-64 object-cover rounded-md"
          />
        </div>
      )}
    </div>
  );
} 