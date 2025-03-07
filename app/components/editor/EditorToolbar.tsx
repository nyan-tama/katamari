'use client';

import { Editor } from '@tiptap/react';
import {
    Bold,
    Italic,
    List,
    ListOrdered,
    Image as ImageIcon,
    Link as LinkIcon,
    Quote,
    Heading1,
    Heading2,
    Undo,
    Redo
} from 'lucide-react';

interface EditorToolbarProps {
    editor: Editor;
    onImageAdd: (file: File) => void;
}

export default function EditorToolbar({ editor, onImageAdd }: EditorToolbarProps) {
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) {
            onImageAdd(e.target.files[0]);
        }
    };

    const setLink = () => {
        const url = window.prompt('リンクURLを入力してください');

        if (url) {
            // リンクの設定
            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
        } else {
            // リンクの解除
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-300 bg-gray-50">
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bold') ? 'bg-gray-200' : ''}`}
                title="太字"
            >
                <Bold size={18} />
            </button>

            <button
                type="button"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('italic') ? 'bg-gray-200' : ''}`}
                title="斜体"
            >
                <Italic size={18} />
            </button>

            <div className="w-px h-6 bg-gray-300 mx-1"></div>

            <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-200' : ''}`}
                title="見出し1"
            >
                <Heading1 size={18} />
            </button>

            <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''}`}
                title="見出し2"
            >
                <Heading2 size={18} />
            </button>

            <div className="w-px h-6 bg-gray-300 mx-1"></div>

            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bulletList') ? 'bg-gray-200' : ''}`}
                title="箇条書き"
            >
                <List size={18} />
            </button>

            <button
                type="button"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('orderedList') ? 'bg-gray-200' : ''}`}
                title="番号付きリスト"
            >
                <ListOrdered size={18} />
            </button>

            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('blockquote') ? 'bg-gray-200' : ''}`}
                title="引用"
            >
                <Quote size={18} />
            </button>

            <div className="w-px h-6 bg-gray-300 mx-1"></div>

            <button
                type="button"
                onClick={setLink}
                className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('link') ? 'bg-gray-200' : ''}`}
                title="リンク"
            >
                <LinkIcon size={18} />
            </button>

            <label className="p-2 rounded hover:bg-gray-200 cursor-pointer" title="画像">
                <ImageIcon size={18} />
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                />
            </label>

            <div className="w-px h-6 bg-gray-300 mx-1"></div>

            <button
                type="button"
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                className="p-2 rounded hover:bg-gray-200 disabled:opacity-50"
                title="元に戻す"
            >
                <Undo size={18} />
            </button>

            <button
                type="button"
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                className="p-2 rounded hover:bg-gray-200 disabled:opacity-50"
                title="やり直す"
            >
                <Redo size={18} />
            </button>
        </div>
    );
} 