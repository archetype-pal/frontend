'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

import { docToTei, teiToDoc, type PMDoc } from '@/lib/tei-prosemirror';
import { teiEditorExtensions } from '@/lib/tei-tiptap';
import { cn } from '@/lib/utils';
import { MsProseTextarea } from './fields';

/**
 * Compact rich editor for a `<p>`-rooted TEI prose leaf (roadmap 3.1). It edits
 * the leaf's inner `<p>`-sequence as WYSIWYG TEI — inline entities (persName,
 * ref, …) render as styled spans via `.tei-rich` rather than raw angle brackets
 * — while guaranteeing zero data loss. A drop-in for {@link MsProseTextarea}.
 *
 * DATA-SAFETY CONTRACT:
 *  - Rich editing is offered ONLY when the value passes the byte-exact gate
 *    (`'' || docToTei(teiToDoc(value)) === value`). When it fails, we fall back
 *    to {@link MsProseTextarea} — a plain textarea that round-trips the raw
 *    string verbatim — so the markup is still editable without loss.
 *  - On edit the editor emits `docToTei(getJSON())` (its own canonical form);
 *    no other normalization is applied.
 *  - An untouched/emptied leaf stays `''` — the editor never spuriously emits
 *    `<p></p>` on mount or focus (see {@link normalizeLeafEmit}).
 *
 * It deliberately does NOT reuse `tei-text-editor.tsx` (runs a per-value
 * `validate-tei` server call the roadmap forbids per-leaf — area-level
 * validation in `msdesc-area-panel` covers it) nor `tei-rich-editor.tsx` (ships
 * the charter clause/`seg`-type toolbar, wrong for msDesc prose). It builds
 * directly on the shared `teiEditorExtensions` + `teiToDoc`/`docToTei` with
 * compact, toolbar-free chrome. Entity/`<ref>` insertion is Phase 4.
 */

// The canonical TEI a single empty ProseMirror paragraph serialises to. TipTap's
// schema keeps at least one paragraph, so an emptied editor emits this; we map
// it back to '' so an untouched/emptied leaf stays empty (never dirties).
const EMPTY_LEAF_TEI = '<p></p>';

/**
 * Byte-exact representability gate (data-safety contract): rich editing is only
 * offered when the leaf's inner XML survives the shared model unchanged. `''` is
 * always representable (an empty leaf). Anything that throws or fails to
 * round-trip is NOT mounted on the rich path.
 */
export function leafIsRichRepresentable(value: string): boolean {
  if (value === '') return true;
  try {
    return docToTei(teiToDoc(value)) === value;
  } catch {
    return false;
  }
}

/**
 * Normalise an editor emit: a bare empty paragraph collapses to `''` so an
 * untouched/emptied leaf never emits `<p></p>` (which would dirty every empty
 * leaf and can break the area composer). A paragraph carrying attributes, or any
 * real content, is emitted verbatim from `docToTei`.
 */
export function normalizeLeafEmit(tei: string): string {
  return tei === EMPTY_LEAF_TEI ? '' : tei;
}

// ProseMirror's `doc` requires `block+` content; an empty leaf parses to zero
// paragraphs, so seed a single empty paragraph the editor schema can hold.
const EMPTY_DOC: PMDoc = {
  type: 'doc',
  content: [{ type: 'paragraph', attrs: { pAttrs: {} }, content: [] }],
};

function toLeafContent(value: string): Record<string, unknown> {
  const doc = teiToDoc(value);
  return (doc.content.length > 0 ? doc : EMPTY_DOC) as unknown as Record<string, unknown>;
}

interface MsDescLeafEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Gate + dispatcher. Renders the compact rich editor when the leaf is
 * representable, otherwise the verbatim-preserving textarea fallback. A mounted
 * rich editor only ever emits `docToTei` output (which round-trips), so it never
 * flips itself to the fallback mid-edit; only an externally-supplied
 * non-representable value routes to the textarea.
 */
export function MsDescLeafEditor(props: MsDescLeafEditorProps) {
  const t = useTranslations('backoffice');
  if (!leafIsRichRepresentable(props.value)) {
    return (
      <MsProseTextarea
        label={props.label}
        value={props.value}
        onChange={props.onChange}
        placeholder={props.placeholder}
        disabled={props.disabled}
        hint={t('msdesc.editor.leafNotRepresentable')}
        className={props.className}
      />
    );
  }
  return <RichLeaf {...props} />;
}

function RichLeaf({ label, value, onChange, disabled, className }: MsDescLeafEditorProps) {
  // Guard the controlled-value effect against the editor's own emits so
  // reflecting `value` back never steals the caret (mirrors tei-rich-editor).
  const lastEmitted = React.useRef<string | null>(null);
  // Always-current `value` for onUpdate (its closure captures the mount value).
  // TipTap fires one onUpdate on mount; for representable content its emit equals
  // the current value's canonical form, so the onUpdate guard swallows that no-op
  // — keeping an untouched leaf from ever calling onChange. Both '' and a stored
  // '<p></p>' (whose canonical emit is '') stay put with zero churn.
  const valueRef = React.useRef(value);
  valueRef.current = value;

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
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
    content: toLeafContent(value),
    editorProps: {
      attributes: {
        class:
          'tei-rich prose prose-sm dark:prose-invert max-w-none min-h-16 px-3 py-2 text-sm focus:outline-none',
        'aria-label': label,
        role: 'textbox',
        'aria-multiline': 'true',
      },
    },
    onUpdate: ({ editor }) => {
      const emitted = normalizeLeafEmit(docToTei(editor.getJSON() as unknown as PMDoc));
      // Skip a no-op emit (the mount-time onUpdate, or an echo of our own
      // setContent): it would only churn the parent, never change the data.
      // Compare against the CANONICAL form of the current value, not its raw
      // bytes: `valueRef.current` is always rich-representable, so its canonical
      // emit is `normalizeLeafEmit(valueRef.current)`. This also swallows the
      // mount emit for a stored '<p></p>' leaf (canonical ''), which the raw-byte
      // check missed — it would fire onChange('') on mere mount and silently drop
      // the empty paragraph. A genuine user clear of non-empty content still
      // differs from its canonical form, so real edits propagate unchanged.
      if (emitted === valueRef.current || emitted === normalizeLeafEmit(valueRef.current)) return;
      lastEmitted.current = emitted;
      onChange(emitted);
    },
  });

  // Reflect controlled-value changes (async hydration, external resets) without
  // stealing the caret: skip when the incoming value is exactly what we last
  // emitted, otherwise re-seed the doc without firing onChange.
  React.useEffect(() => {
    if (!editor) return;
    if (value === lastEmitted.current) return;
    editor.commands.setContent(toLeafContent(value), { emitUpdate: false });
    lastEmitted.current = value;
  }, [editor, value]);

  React.useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  return (
    <div className={cn('space-y-1', className)}>
      <label className="block text-xs font-medium text-muted-foreground">{label}</label>
      <div
        className={cn(
          'rounded-md border border-input bg-background shadow-sm focus-within:ring-1 focus-within:ring-ring',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        {editor ? <EditorContent editor={editor} /> : <div className="min-h-16 px-3 py-2" />}
      </div>
    </div>
  );
}
