'use client';

import { useEffect, useRef } from 'react';

interface ArticleContentProps {
    content: any;
}

export default function ArticleContent({ content }: ArticleContentProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // JSONコンテンツからHTMLを生成する関数
        const renderContent = () => {
            if (!containerRef.current) return;

            // TipTapのJSONコンテンツをHTML形式に変換するロジック
            // ここでは簡略化しています。実際にはより複雑な変換が必要かもしれません
            let html = '<div class="prose prose-lg prose-pink max-w-none">';

            if (content.content) {
                content.content.forEach((node: any) => {
                    switch (node.type) {
                        case 'paragraph':
                            html += '<p>';
                            if (node.content) {
                                node.content.forEach((inline: any) => {
                                    if (inline.type === 'text') {
                                        html += inline.text;
                                    } else if (inline.type === 'image') {
                                        html += `<img src="${inline.attrs.src}" alt="" />`;
                                    }
                                });
                            }
                            html += '</p>';
                            break;
                        case 'heading':
                            const level = node.attrs?.level || 1;
                            html += `<h${level}>`;
                            if (node.content) {
                                node.content.forEach((inline: any) => {
                                    if (inline.type === 'text') {
                                        html += inline.text;
                                    }
                                });
                            }
                            html += `</h${level}>`;
                            break;
                        case 'image':
                            html += `<img src="${node.attrs.src}" alt="" class="rounded-lg my-4" />`;
                            break;
                        // 他のノードタイプも同様に処理
                    }
                });
            }

            html += '</div>';
            containerRef.current.innerHTML = html;
        };

        renderContent();
    }, [content]);

    return <div ref={containerRef} />;
} 