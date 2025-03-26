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
                    <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 0 1-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-.143-.175-.143h-2.414c-.103.4-.43.962-.734 1.48-.43.767-1.07 1.466-1.733 2.154-.664.69-1.36 1.347-2.112 2.004-.402.35-.806.683-1.39.683-.345 0-.663-.117-.663-.35V10.11c0-2.807-1.02-4.406-2.437-5.146m17.953 1.59c0 4.296-4.048 7.792-9.02 7.792-4.694 0-8.532-3.145-9.02-7.054-.02-.2-.002-.4.056-.586.115-.36.384-.62.56-.62.56.066 1.13.13 1.674.22.43.7.886.18 1.33.28 1.76.4 3.466.946 4.895 1.857 1.42.904 2.735 2.173 3.456 3.788.64 1.445 1.715 2.356 3.215 2.788.586.166.568.88.054.988m-7.38-5.06c0 .543-.045 1.085-.133 1.622-.087.533-.22 1.056-.4 1.568-.18.508-.396.984-.655 1.42-.258.434-.54.808-.86 1.118-.323.307-.664.49-1.023.49-.36 0-.7-.183-1.023-.49-.323-.308-.604-.684-.862-1.118-.256-.438-.475-.913-.652-1.42-.18-.51-.314-1.034-.402-1.567-.087-.536-.132-1.08-.132-1.622 0-.54.045-1.084.132-1.618.088-.538.223-1.06.403-1.568.177-.507.396-.98.653-1.418.258-.44.537-.96.86-1.266.324-.21.664-.417 1.024-.417s.7.207 1.024.418c.322.305.604.824.86 1.265.26.44.477.91.656 1.42.18.508.313 1.03.4 1.567.09.534.134 1.077.134 1.618m-1.944 0c0-.646-.042-1.28-.128-1.902-.085-.624-.215-1.114-.4-1.47-.18-.358-.39-.505-.632-.505-.244 0-.454.147-.633.505-.18.356-.317.846-.403 1.47-.083.622-.128 1.256-.128 1.903 0 .645.045 1.282.128 1.903.086.622.222 1.114.403 1.47.18.356.39.5.632.5.243 0 .453-.144.633-.5.18-.356.315-.848.4-1.47.086-.62.13-1.258.13-1.903" />
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