'use client';

import { useRouter } from 'next/navigation';

interface NavigationButtonsProps {
    className?: string;
}

export default function NavigationButtons({
    className = 'flex gap-6'
}: NavigationButtonsProps) {
    const router = useRouter();

    const handleBack = () => {
        router.back();
    };

    return (
        <div className={className}>
            <button
                onClick={handleBack}
                className="text-indigo-600 hover:text-indigo-800 cursor-pointer"
                type="button"
            >
                ← 前のページに戻る
            </button>
        </div>
    );
} 