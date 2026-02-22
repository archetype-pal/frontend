'use client'

import { useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo,
  CodeSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Toggle } from '@/components/ui/toggle'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
  /** Minimal mode: fewer toolbar options. */
  minimal?: boolean
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
  className,
  minimal = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-primary underline' },
      }),
      Image.configure({
        HTMLAttributes: { class: 'rounded-md max-w-full' },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none min-h-[200px] focus:outline-none px-4 py-3',
          minimal && 'min-h-[120px]'
        ),
      },
    },
  })

  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [imageOpen, setImageOpen] = useState(false)
  const [imageUrl, setImageUrl] = useState('')

  if (!editor) return null

  function insertLink() {
    if (linkUrl) {
      editor!.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run()
    }
    setLinkUrl('')
    setLinkOpen(false)
  }

  function insertImage() {
    if (imageUrl) {
      editor!.chain().focus().setImage({ src: imageUrl }).run()
    }
    setImageUrl('')
    setImageOpen(false)
  }

  return (
    <div className={cn('rounded-md border', className)}>
      {/* Toolbar */}
      <div className='flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5'>
        <Toggle
          size='sm'
          pressed={editor.isActive('bold')}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          aria-label='Bold'
        >
          <Bold className='h-4 w-4' />
        </Toggle>
        <Toggle
          size='sm'
          pressed={editor.isActive('italic')}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          aria-label='Italic'
        >
          <Italic className='h-4 w-4' />
        </Toggle>
        <Toggle
          size='sm'
          pressed={editor.isActive('strike')}
          onPressedChange={() => editor.chain().focus().toggleStrike().run()}
          aria-label='Strikethrough'
        >
          <Strikethrough className='h-4 w-4' />
        </Toggle>
        <Toggle
          size='sm'
          pressed={editor.isActive('code')}
          onPressedChange={() => editor.chain().focus().toggleCode().run()}
          aria-label='Inline code'
        >
          <Code className='h-4 w-4' />
        </Toggle>

        <Separator orientation='vertical' className='mx-1 h-6' />

        {!minimal && (
          <>
            <Toggle
              size='sm'
              pressed={editor.isActive('heading', { level: 1 })}
              onPressedChange={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
              aria-label='Heading 1'
            >
              <Heading1 className='h-4 w-4' />
            </Toggle>
            <Toggle
              size='sm'
              pressed={editor.isActive('heading', { level: 2 })}
              onPressedChange={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              aria-label='Heading 2'
            >
              <Heading2 className='h-4 w-4' />
            </Toggle>
            <Toggle
              size='sm'
              pressed={editor.isActive('heading', { level: 3 })}
              onPressedChange={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
              aria-label='Heading 3'
            >
              <Heading3 className='h-4 w-4' />
            </Toggle>

            <Separator orientation='vertical' className='mx-1 h-6' />
          </>
        )}

        <Toggle
          size='sm'
          pressed={editor.isActive('bulletList')}
          onPressedChange={() =>
            editor.chain().focus().toggleBulletList().run()
          }
          aria-label='Bullet list'
        >
          <List className='h-4 w-4' />
        </Toggle>
        <Toggle
          size='sm'
          pressed={editor.isActive('orderedList')}
          onPressedChange={() =>
            editor.chain().focus().toggleOrderedList().run()
          }
          aria-label='Ordered list'
        >
          <ListOrdered className='h-4 w-4' />
        </Toggle>

        {!minimal && (
          <>
            <Toggle
              size='sm'
              pressed={editor.isActive('blockquote')}
              onPressedChange={() =>
                editor.chain().focus().toggleBlockquote().run()
              }
              aria-label='Blockquote'
            >
              <Quote className='h-4 w-4' />
            </Toggle>
            <Toggle
              size='sm'
              pressed={editor.isActive('codeBlock')}
              onPressedChange={() =>
                editor.chain().focus().toggleCodeBlock().run()
              }
              aria-label='Code block'
            >
              <CodeSquare className='h-4 w-4' />
            </Toggle>

            <Separator orientation='vertical' className='mx-1 h-6' />

            <Button
              variant='ghost'
              size='sm'
              className='h-8 w-8 p-0'
              onClick={() =>
                editor.chain().focus().setHorizontalRule().run()
              }
              title='Horizontal rule'
            >
              <Minus className='h-4 w-4' />
            </Button>
          </>
        )}

        <Separator orientation='vertical' className='mx-1 h-6' />

        <Popover open={linkOpen} onOpenChange={setLinkOpen}>
          <PopoverTrigger asChild>
            <Button
              variant='ghost'
              size='sm'
              className='h-8 w-8 p-0'
              title='Add link'
            >
              <LinkIcon className='h-4 w-4' />
            </Button>
          </PopoverTrigger>
          <PopoverContent className='w-80 p-3' align='start'>
            <div className='space-y-2'>
              <Input
                placeholder='https://example.com'
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && insertLink()}
                autoFocus
              />
              <div className='flex justify-end gap-2'>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => { setLinkUrl(''); setLinkOpen(false) }}
                >
                  Cancel
                </Button>
                <Button size='sm' onClick={insertLink}>
                  Insert
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {!minimal && (
          <Popover open={imageOpen} onOpenChange={setImageOpen}>
            <PopoverTrigger asChild>
              <Button
                variant='ghost'
                size='sm'
                className='h-8 w-8 p-0'
                title='Add image'
              >
                <ImageIcon className='h-4 w-4' />
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-80 p-3' align='start'>
              <div className='space-y-2'>
                <Input
                  placeholder='https://example.com/image.png'
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && insertImage()}
                  autoFocus
                />
                <div className='flex justify-end gap-2'>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => { setImageUrl(''); setImageOpen(false) }}
                  >
                    Cancel
                  </Button>
                  <Button size='sm' onClick={insertImage}>
                    Insert
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        <div className='ml-auto flex items-center gap-0.5'>
          <Button
            variant='ghost'
            size='sm'
            className='h-8 w-8 p-0'
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title='Undo'
          >
            <Undo className='h-4 w-4' />
          </Button>
          <Button
            variant='ghost'
            size='sm'
            className='h-8 w-8 p-0'
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title='Redo'
          >
            <Redo className='h-4 w-4' />
          </Button>
        </div>
      </div>

      {/* Editor content */}
      <EditorContent editor={editor} />
    </div>
  )
}
