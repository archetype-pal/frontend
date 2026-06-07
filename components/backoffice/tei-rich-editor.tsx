'use client';

import * as React from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

import {
  SEG_TYPES,
  currentElement,
  retypeTei,
  teiEditorExtensions,
  unwrapTei,
  wrapTei,
} from '@/lib/tei-tiptap';
import { docToTei, teiToDoc, type PMDoc, type StackEntry } from '@/lib/tei-prosemirror';

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
    // The TEI doc model (tei-prosemirror) can only represent paragraphs + text
    // carrying the `tei` stack-mark + `teiEmpty` atoms. Disable every StarterKit
    // mark/node it can't serialise, so editors can't silently introduce
    // bold/headings/lists/hardBreaks that docToTei would drop or choke on.
    extensions: [
      StarterKit.configure({
        bold: false,
        italic: false,
        strike: false,
        code: false,
        codeBlock: false,
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
        horizontalRule: false,
        hardBreak: false,
      }),
      ...teiEditorExtensions,
    ],
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

  // Track the innermost element under the selection so the retype control can
  // show its current type and act on it.
  const [selectedEl, setSelectedEl] = React.useState<StackEntry | null>(null);
  React.useEffect(() => {
    if (!editor) return;
    const update = () => setSelectedEl(currentElement(editor));
    editor.on('selectionUpdate', update);
    editor.on('transaction', update);
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
    };
  }, [editor]);

  if (!editor) return null;

  const retypeableSeg = selectedEl?.el === 'seg';

  const btn =
    'rounded border px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40';

  // Keep focus (and therefore the text selection) in the editor when a toolbar
  // button is pressed — without this, mousedown blurs the editor and a wrap
  // could act on a collapsed selection.
  const keepSelection = (event: React.MouseEvent) => event.preventDefault();

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 border-b px-2 py-1.5">
        <span className="mr-1 text-[10px] uppercase tracking-wide text-muted-foreground">
          Wrap selection
        </span>
        <button
          type="button"
          className={btn}
          onMouseDown={keepSelection}
          onClick={() => wrapTei(editor, 'persName', { type: 'name' })}
        >
          Person
        </button>
        <button
          type="button"
          className={btn}
          onMouseDown={keepSelection}
          onClick={() => wrapTei(editor, 'placeName', { type: 'name' })}
        >
          Place
        </button>
        <button
          type="button"
          className={btn}
          onMouseDown={keepSelection}
          onClick={() => wrapTei(editor, 'ex', {})}
        >
          Expansion
        </button>
        <button
          type="button"
          className={btn}
          onMouseDown={keepSelection}
          onClick={() => wrapTei(editor, 'supplied', {})}
        >
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
        <select
          aria-label="Change clause type"
          title={
            retypeableSeg
              ? 'Change the selected clause type'
              : 'Select text inside a clause to retype it'
          }
          className="ml-auto rounded border bg-transparent px-1 py-0.5 text-[11px] text-muted-foreground disabled:opacity-40"
          disabled={!retypeableSeg}
          value={retypeableSeg ? (selectedEl?.attrs?.type ?? '') : ''}
          onChange={(event) => {
            if (event.target.value) retypeTei(editor, event.target.value);
          }}
        >
          <option value="">Retype…</option>
          {SEG_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={btn}
          onMouseDown={keepSelection}
          onClick={() => unwrapTei(editor)}
        >
          Unwrap
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
