'use client';

import * as React from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

import { teiEditorExtensions } from '@/lib/tei-tiptap';
import { docToTei, teiToDoc, type PMDoc } from '@/lib/tei-prosemirror';

interface TeiRichEditorProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Rendered (WYSIWYG) TEI editor. Loads content as ProseMirror JSON via
 * teiToDoc and emits TEI via docToTei(getJSON()) — text edits preserve the
 * surrounding markup (the stack-mark travels with the text). Client-only.
 */
export default function TeiRichEditor({ value, onChange }: TeiRichEditorProps) {
  // Remember the TEI we last emitted so an external value change (e.g. mode
  // switch) re-seeds the editor, but our own edits don't loop.
  const lastEmitted = React.useRef<string | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, ...teiEditorExtensions],
    content: teiToDoc(value) as unknown as Record<string, unknown>,
    editorProps: {
      attributes: {
        class:
          'tei-rich prose prose-sm dark:prose-invert max-w-none min-h-[320px] px-4 py-3 focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      const tei = docToTei(editor.getJSON() as unknown as PMDoc);
      lastEmitted.current = tei;
      onChange(tei);
    },
  });

  React.useEffect(() => {
    if (!editor) return;
    if (value === lastEmitted.current) return;
    editor.commands.setContent(teiToDoc(value) as unknown as Record<string, unknown>, {
      emitUpdate: false,
    });
    lastEmitted.current = value;
  }, [editor, value]);

  if (!editor) return null;
  return <EditorContent editor={editor} />;
}
