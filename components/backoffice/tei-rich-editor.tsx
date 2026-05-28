'use client';

import * as React from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

import { SEG_TYPES, teiEditorExtensions, unwrapTei, wrapTei } from '@/lib/tei-tiptap';
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

  const btn =
    'rounded border px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 border-b px-2 py-1.5">
        <span className="mr-1 text-[10px] uppercase tracking-wide text-muted-foreground">
          Wrap selection
        </span>
        <button
          type="button"
          className={btn}
          onClick={() => wrapTei(editor, 'persName', { type: 'name' })}
        >
          Person
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => wrapTei(editor, 'placeName', { type: 'name' })}
        >
          Place
        </button>
        <button type="button" className={btn} onClick={() => wrapTei(editor, 'ex', {})}>
          Expansion
        </button>
        <button type="button" className={btn} onClick={() => wrapTei(editor, 'supplied', {})}>
          Supplied
        </button>
        <select
          aria-label="Wrap selection in clause"
          className="rounded border bg-transparent px-1 py-0.5 text-[11px] text-muted-foreground"
          value=""
          onChange={(event) => {
            if (event.target.value) wrapTei(editor, 'seg', { type: event.target.value });
            event.currentTarget.value = '';
          }}
        >
          <option value="">Clause…</option>
          {SEG_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button type="button" className={`${btn} ml-auto`} onClick={() => unwrapTei(editor)}>
          Unwrap
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
