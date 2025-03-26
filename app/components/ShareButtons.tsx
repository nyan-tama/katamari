'use client';

import { useEffect, useState } from 'react';

interface ShareButtonsProps {
    title: string;
    url: string;
    description?: string;
}

export default function ShareButtons({ title, url, description = '' }: ShareButtonsProps) {
    const [mounted, setMounted] = useState(false);
    const [currentUrl, setCurrentUrl] = useState(url);

    // クライアントサイドでのみ実行
    useEffect(() => {
        setMounted(true);
        // URLが相対パスの場合、完全なURLに変換
        if (!url.startsWith('http')) {
            const baseUrl = window.location.origin;
            setCurrentUrl(`${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`);
        }
    }, [url]);

    if (!mounted) return null;

    const encodedUrl = encodeURIComponent(currentUrl);
    const encodedTitle = encodeURIComponent(`${title} | カタマリ`);
    const encodedDescription = encodeURIComponent(description || '作品を共有します');

    return (
        <div className="flex flex-wrap items-center gap-3 py-4">
            <span className="text-gray-700 font-medium">共有:</span>

            {/* X (旧Twitter)共有 */}
            <a
                href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-black text-white hover:bg-gray-800 transition-colors"
                aria-label="Xで共有"
            >
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
            </a>

            {/* Instagram共有 */}
            <a
                href={`https://www.instagram.com/?url=${encodedUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 text-white hover:opacity-90 transition-opacity"
                aria-label="Instagramで共有"
            >
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153.509.5.902 1.105 1.153 1.772.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 01-1.153 1.772c-.5.508-1.105.902-1.772 1.153-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 01-1.772-1.153 4.904 4.904 0 01-1.153-1.772c-.247-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.066.217-1.79.465-2.428a4.88 4.88 0 011.153-1.772A4.897 4.897 0 015.45 2.525c.638-.247 1.362-.415 2.428-.465C8.944 2.013 9.283 2 12 2zm0 1.802c-2.67 0-2.986.01-4.04.059-.976.045-1.505.207-1.858.344-.466.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.048 1.055-.058 1.37-.058 4.04 0 2.67.01 2.986.058 4.04.044.976.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.684.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.04.058 2.67 0 2.986-.01 4.04-.058.976-.044 1.504-.207 1.857-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.352.3-.881.344-1.857.048-1.054.058-1.37.058-4.04 0-2.67-.01-2.986-.058-4.04-.044-.976-.207-1.504-.344-1.857a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.881-.3-1.857-.344-1.054-.048-1.37-.058-4.04-.058zm0 3.063a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 8.468a3.333 3.333 0 100-6.666 3.333 3.333 0 000 6.666zm6.538-8.469a1.2 1.2 0 11-2.4 0 1.2 1.2 0 012.4 0z" />
                </svg>
            </a>

            {/* TikTok共有 */}
            <a
                href={`https://www.tiktok.com/share?url=${encodedUrl}&title=${encodedTitle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-black text-white hover:opacity-90 transition-opacity"
                aria-label="TikTokで共有"
            >
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
                </svg>
            </a>

            {/* Facebook共有 */}
            <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#1877F2] text-white hover:bg-opacity-90 transition-colors"
                aria-label="Facebookで共有"
            >
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96A10 10 0 0 0 22 12.06C22 6.53 17.5 2.04 12 2.04Z" />
                </svg>
            </a>

            {/* Line共有 */}
            <a
                href={`https://social-plugins.line.me/lineit/share?url=${encodedUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#06C755] text-white hover:bg-opacity-90 transition-colors"
                aria-label="LINEで共有"
            >
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M21.727 10.909c0-4.377-4.389-7.937-9.787-7.937-5.398 0-9.787 3.56-9.787 7.937 0 3.925 3.480 7.213 8.186 7.843.319.068.753.21.863.482.099.248.065.636.032.885 0 0-.114.692-.14.839-.043.247-.198.967.85.527 1.047-.44 5.655-3.33 7.711-5.705 1.423-1.56 2.072-3.144 2.072-4.871z" />
                </svg>
            </a>

            {/* メール共有 */}
            <a
                href={`mailto:?subject=${encodedTitle}&body=${encodedDescription}%0D%0A${encodedUrl}`}
                className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gray-600 text-white hover:bg-opacity-90 transition-colors"
                aria-label="メールで共有"
            >
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20,8L12,13L4,8V6L12,11L20,6M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z" />
                </svg>
            </a>
        </div>
    );
} 