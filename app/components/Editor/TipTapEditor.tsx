import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import { useState } from 'react'

// ツールバーボタンコンポーネント
const ToolbarButton = ({ 
  icon, 
  active = false, 
  onClick 
}: { 
  icon: React.ReactNode; 
  active?: boolean; 
  onClick: () => void;
}) => (
  <button
    className={`p-2 rounded-md ${active ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500 hover:bg-gray-100'}`}
    onClick={onClick}
  >
    {icon}
  </button>
)

// メインエディタコンポーネント
interface TipTapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

const TipTapEditor = ({ content, onChange, placeholder = '記事を書いてみましょう...' }: TipTapEditorProps) => {
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-500 underline',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full rounded-lg my-4',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  if (!editor) {
    return null
  }

  // 画像アップロード処理（後で実装）
  const addImage = async () => {
    // この部分は後でSupabaseのストレージを使った画像アップロード処理を実装します
    const url = prompt('画像URLを入力してください')
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

  // リンク追加処理
  const setLink = () => {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run()
      return
    }
    
    setIsLinkModalOpen(true)
  }

  const confirmLink = () => {
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run()
    }
    setIsLinkModalOpen(false)
    setLinkUrl('')
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* ツールバー */}
      <div className="flex flex-wrap bg-white border-b border-gray-300 p-2 gap-1">
        <ToolbarButton 
          icon={<span className="font-bold">H1</span>} 
          active={editor.isActive('heading', { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        />
        <ToolbarButton 
          icon={<span className="font-bold">H2</span>} 
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        />
        <ToolbarButton 
          icon={<span className="font-bold">H3</span>} 
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        />
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        <ToolbarButton 
          icon={<span className="font-bold">B</span>} 
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton 
          icon={<span className="italic">I</span>} 
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton 
          icon={<span className="underline">U</span>} 
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
        <ToolbarButton 
          icon={<span className="line-through">S</span>} 
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        <ToolbarButton 
          icon={<span>リスト</span>} 
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton 
          icon={<span>番号</span>} 
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        <ToolbarButton 
          icon={<span>リンク</span>} 
          active={editor.isActive('link')}
          onClick={setLink}
        />
        <ToolbarButton 
          icon={<span>画像</span>} 
          active={false}
          onClick={addImage}
        />
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        <ToolbarButton 
          icon={<span>左揃え</span>} 
          active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        />
        <ToolbarButton 
          icon={<span>中央</span>} 
          active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        />
        <ToolbarButton 
          icon={<span>右揃え</span>} 
          active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        />
      </div>

      {/* エディタ本文 */}
      <EditorContent editor={editor} className="prose max-w-none p-4 min-h-[300px]" />

      {/* リンクモーダル */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-4 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-medium mb-2">リンクを追加</h3>
            <input
              type="text"
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full p-2 border border-gray-300 rounded mb-4"
            />
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setIsLinkModalOpen(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                キャンセル
              </button>
              <button 
                onClick={confirmLink}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TipTapEditor 