'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useState, useCallback } from 'react';
import { createClientSupabase } from '@/lib/supabase-client';
import EditorToolbar from './EditorToolbar';

interface EditorProps {
    initialContent: any;
    onChange: (content: any) => void;
}

export default function Editor({ initialContent, onChange }: EditorProps) {
    const [isUploading, setIsUploading] = useState(false);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Image,
            Link.configure({
                openOnClick: false,
            }),
            Placeholder.configure({
                placeholder: '記事の内容を入力してください...',
            }),
        ],
        content: initialContent,
        onUpdate: ({ editor }) => {
            const json = editor.getJSON();
            onChange(json);
        },
        editorProps: {
            attributes: {
                class: 'prose prose-pink max-w-none focus:outline-none min-h-[300px] px-4',
            },
        },
    });

    const addImage = useCallback(
        async (file: File) => {
            if (!editor || isUploading) return;

            try {
                setIsUploading(true);
                const supabase = createClientSupabase();
                const { data: { session } } = await supabase.auth.getSession();

                if (!session?.user) {
                    alert('画像をアップロードするにはログインが必要です');
                    return;
                }

                // ファイルサイズチェック（10MB上限）
                if (file.size > 10 * 1024 * 1024) {
                    alert('ファイルサイズが大きすぎます（最大10MB）');
                    return;
                }

                // 画像のアップロード
                const fileExt = file.name.split('.').pop();
                const filePath = `${session.user.id}/${Date.now()}_article_image.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('article_images')
                    .upload(filePath, file, {
                        upsert: true
                    });

                if (uploadError) {
                    throw uploadError;
                }

                // 画像の公開URLを取得
                const { data: { publicUrl } } = supabase.storage
                    .from('article_images')
                    .getPublicUrl(filePath);

                // エディタに画像を挿入
                editor.chain().focus().setImage({ src: publicUrl }).run();
            } catch (error) {
                console.error('画像アップロードエラー:', error);
                alert('画像のアップロードに失敗しました');
            } finally {
                setIsUploading(false);
            }
        },
        [editor, isUploading]
    );

    if (!editor) {
        return <div>エディタを読み込み中...</div>;
    }

    return (
        <div className="border border-gray-300 rounded-md overflow-hidden">
            <EditorToolbar editor={editor} onImageAdd={addImage} />
            <EditorContent editor={editor} />
        </div>
    );
} 